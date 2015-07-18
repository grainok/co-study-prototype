var React = require('react');
var BackgroundUtil = require('../common/background-util');
var IsMobile = require('../common/is-mobile');
var _ = require('underscore');
var moment = require('moment');
var Scroller = require('scroller');
var $ = require('jquery');
var getVendorPropertyName = require("react-kit/getVendorPropertyName");
var ReactComponentWithPureRenderMixin = require('react/lib/ReactComponentWithPureRenderMixin');
var TimeoutTransitionGroup = require('../common/timeout-transition-group');
var ReactCSSTransitionGroup = require('react/lib/ReactCSSTransitionGroup');
var Backbone = require('backbone');
var Mixins = require('../common/mixins');
var TRANSITION_DURATION = 800;
var appendVendorPrefix = require('react-kit/appendVendorPrefix');
var ArticleImage = require('./article-image');


var PageComponent = React.createClass({
	mixins: [ReactComponentWithPureRenderMixin],
	render: function() {
		var style = _.extend({boxShadow: 'rgba(39, 41, 43, 0.8) 0px 1px 6px 0px', background: 'white', transitionProperty: 'transform', transitionDuration: TRANSITION_DURATION + 'ms', position: 'absolute', left: 0, top: 0, width: this.props.width, height: this.props.height, overflow: 'hidden', zIndex: 1000 - this.props.index}, this.props.style);
		style = appendVendorPrefix(style);
		return (
			<div style={style} className="page-box-shadow">
				{this.props.children}
			</div>
		);
	}
});
var MobilePlayer = React.createClass({
	mixins: [ReactComponentWithPureRenderMixin, Mixins.ListenTo, Mixins.WindowSizeMixin],
	getDefaultProps: function() {
		return {
			scrollingDeceleration: 0.95,
			scrollingPenetrationAcceleration: 0.08
		}
	},
	getInitialState: function() {
		return {
			currentIndex: 0
		};
	},
	componentDidMount: function() {
		this.createScroller();
	},
	componentDidUpdate: function() {
		this.state.nextIndex = false;
	},
	changeToPageIndex: function(index) {
		if (this._preventScroll) {
			return;
		}
		if (typeof index === 'number') {
			this._preventScroll = true;
			this.setState({
				nextIndex: index
			}, ()=> {
				requestAnimationFrame(()=>{
					this.scroller.scrollTo(0, index * window.innerHeight, 500);
					this._preventScroll = false;
				});
			});
		}
	},
	getCurrentPageIndex: function() {
		return this.state.currentIndex;
	},
	renderPage: function(page, index) {				
		if (!page) {
			return null;
		}
		page = React.cloneElement(page, {ref: 'page-' + index, key: 'page-' + index});
		var currentIndex = this.state.currentIndex;		
		var isRender = this.state.nextIndex? (index === currentIndex || index === this.state.nextIndex):(index - 1 <= currentIndex && index + 1 >= currentIndex);
		return (
			isRender ?<PageComponent width={this.state.width} height={this.state.height} ref={"card-" + index} key={"card-" + index} index={index} style={{
				transitionDuration: 0,
				transform: index < currentIndex? 'translate3d(0, ' + (-window.innerHeight - 20) + 'px, 0)': 'translate3d(0, 0, 0)'
			}}>
				{page}
			</PageComponent>: null
		);
	},
	createScroller: function () {
    var options = {
      scrollingX: false,
      scrollingY: true,
      decelerationRate: this.props.scrollingDeceleration,
      penetrationAcceleration: this.props.scrollingPenetrationAcceleration,
      // snapping: false,
      // zooming: true,
      bouncing: false,
      paging: true,
      scrollingComplete: this.handleScrollComplete
    };
    this._scrollTop = this.props.initScrollTop || 0;
    this.scroller = new Scroller(this.handleScroll, options);
    var dataLength = this.props.children.length;
    // dataLength = 5;
    var width = window.innerWidth;
    var height = window.innerHeight;
    this.scroller.setDimensions(width, height, width, height * dataLength);
    this.scroller.setSnapSize(width, height);    
    if (this._scrollTop !== 0) {
    	this.scroller.scrollTo(this._scrollTop, 0);
    	this.handleScrollComplete();
    }
  },
  handleScroll: function(left, top, zoom) {  	
  	this._zoom = zoom;
  	var currentIndex = this.state.currentIndex;
  	var currentCard = this.refs['card-' + currentIndex];
  	if (!currentCard) {
  		return;
  	}
  	var absTop = top - (window.innerHeight * currentIndex);
  	if (absTop >= 0 && absTop <= window.innerHeight) {
  		currentCard.getDOMNode().style[getVendorPropertyName('transform')] = 'translate3d(0px,' + (-absTop) + 'px, 0) scale(' + zoom + ')';
  	} else if (currentIndex - 1 >= 0 && absTop < 0) {
  		var prevIndex = currentIndex - 1;
  		var prevCard = this.refs['card-' + prevIndex];
  		absTop += window.innerHeight;
  		currentCard.getDOMNode().style[getVendorPropertyName('transform')] = 'translate3d(0,0,0)';  		
  		if (prevCard && absTop >= 0) {
  			prevCard.getDOMNode().style[getVendorPropertyName('transform')] = 'translate3d(0px,' + (-absTop) + 'px, 0) scale(' + zoom + ')';
  		}
  	}
  	this._scrollTop = top;
  },
  handleScrollComplete: function() {
  	var currentIndex = Math.round(this._scrollTop/window.innerHeight);  	
  	this._preventScroll = true;
  	this.setState({
  		scrollTop: this._scrollTop,
  		currentIndex: currentIndex
  	}, ()=>{
  		var currentCard = this.refs['card-' + currentIndex]
  			, nextCard = this.refs['card-' + (currentIndex + 1)]
  			, prevCard = this.refs['card-' + (currentIndex - 1)];
  		if (currentCard) {
  			currentCard.getDOMNode().style[getVendorPropertyName('transform')] = 'translate3d(0,0,0)';
  		}
  		if (nextCard) {
  			nextCard.getDOMNode().style[getVendorPropertyName('transform')] = 'translate3d(0,0,0)';
  		}
  		if (prevCard) {
  			prevCard.getDOMNode().style[getVendorPropertyName('transform')] = 'translate3d(0,' + (-window.innerHeight - 20) + 'px,0)';
  		}
  		this._preventScroll = false;
  	});
  	this.updateScrollingDeceleration();  	
  },

  updateScrollingDeceleration: function () {
    var currVelocity = this.scroller.__decelerationVelocityY;
    var currScrollTop = this._scrollTop;
    var targetScrollTop = 0;
    var estimatedEndScrollTop = currScrollTop;

    while (Math.abs(currVelocity).toFixed(6) > 0) {
      estimatedEndScrollTop += currVelocity;
      currVelocity *= this.props.scrollingDeceleration;
    }

    // Find the page whose estimated end scrollTop is closest to 0.
    var closestZeroDelta = Infinity;
    var pageHeight = window.innerHeight;
    var pageCount = this.props.children.length;
    var pageScrollTop;

    for (var pageIndex=0, len=pageCount; pageIndex < len; pageIndex++) {
      pageScrollTop = (pageHeight * pageIndex) - estimatedEndScrollTop;
      if (Math.abs(pageScrollTop) < closestZeroDelta) {
        closestZeroDelta = Math.abs(pageScrollTop);
        targetScrollTop = pageHeight * pageIndex;
      }
    }

    this.scroller.__minDecelerationScrollTop = targetScrollTop;
    this.scroller.__maxDecelerationScrollTop = targetScrollTop;
  },
  handleTouchStart: function (e) {
  	if (this._preventScroll) {
  		return;
  	}
  	this._touch = true;
  	this.scroller.doTouchStart(e.touches, e.timeStamp);
  },

  handleTouchMove: function (e) {
  	if (!this._touch) {
  		return;
  	}
  	e.preventDefault();
    this.scroller.doTouchMove(e.touches, e.timeStamp, e.scale);
  },

  handleTouchEnd: function (e) {
  	if (!this._touch) {
  		return;
  	}
    this.scroller.doTouchEnd(e.timeStamp);
  },
	render: function() {
		return (
			<div onTouchStart={this.handleTouchStart} onTouchMove={this.handleTouchMove} onTouchEnd={this.handleTouchEnd} style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}>
				{this.props.children.map(this.renderPage)}
			</div>
		);
	}
});
var DesktopPlayer = React.createClass({
	mixins: [ReactComponentWithPureRenderMixin, Mixins.ListenTo, Mixins.WindowSizeMixin],
	getInitialState: function() {
		return {
			currentIndex: 0
		};
	},
	componentDidMount: function() {
		$('html, body').css('background', 'black');
		this.listenTo(window, 'keydown', (e)=>{
			if (e.keyCode === 40) {
				if (this.state.currentIndex === this.props.children.length - 1) {
					return;
				}
				this.setState({
					currentIndex: this.state.currentIndex + 1
				});
			} else if (e.keyCode === 38) {
				if (this.state.currentIndex === 0) {
					return;
				}
				this.setState({
					currentIndex: this.state.currentIndex - 1
				});
			}
		});
	},
	componentDidUpdate: function(prevProps, prevState) {
		if (prevState.currentIndex !== this.state.currentIndex) {
			setTimeout(this.playPageAnimation, TRANSITION_DURATION);
		}
	},
	changeToPageIndex: function(index) {
		this.setState({currentIndex: index});
	},
	playPageAnimation: function() {
		var index = this.state.currentIndex;
		var page = this.refs['page-' + index];
		if (page.playAnimation) {
			page.playAnimation();
		}
	},
	renderCurrentPage: function() {
		var index = this.state.currentIndex;
		var page = this.props.children[index];
		if (!page) {
			return null;
		}
		page = React.cloneElement(page, {ref: 'page-' + index, key: 'page-' + index});
		return (
			<PageComponent width={this.state.width} height={this.state.height} key={"page-container-" + index} index={index}>
				{page}
			</PageComponent>
		);
	},
	render: function() {
		var transitionName;
    var currentPageIndex = this.state.currentIndex;
    var isNextPage = true;
    if (!this._prevIndex) {
    	transitionName = 'moveFromBottom';
    } else if (currentPageIndex > this._prevIndex) {
      transitionName = 'moveFromBottom';
    } else {
      transitionName = 'moveToBottom';
      isNextPage = false;
    }
    this._prevIndex = currentPageIndex;    

		return (
			<TimeoutTransitionGroup transitionName={transitionName} enterTimeout={TRANSITION_DURATION} leaveTimeout={TRANSITION_DURATION} transitionEnter={!isNextPage} style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}>
				{this.renderCurrentPage()}
			</TimeoutTransitionGroup>
		);
	}
});
var SectionA = require('./section-1');
var LatestSection = require('./latest-section');
var PolygonContainer = require('./mock-polygon-container');
var FullWidthSection1 = require('./full-width-section');
var ad1 = 'http://touchedition.s3.amazonaws.com/asset/55420f2fe57b85e332bfdcab.jpg';
var ad2 = 'http://touchedition.s3.amazonaws.com/asset/5559d77d6526e2152c531adb.jpg';
var Menubar = require('./menubar');
var CoverSection = require('./cover-mobile-section');
var Section2 = require('./section-2');
var transitionEvents = require('react-kit/transitionEvents');
var SectionContents = React.createClass({
	render: function() {
		return (
			<div style={{background: 'white', width: '100%', height: '100%'}}>
				<img src="/images/Logo_GMLive_for_profile_color.png" style={{position: 'absolute', right: 20, top: 20, width: 120}}/>
				<h1>{this.props.title}</h1>
				<p>{this.props.tagline}</p>
				<div>
					{this.props.data.map((d)=>{
						return <h3><a>{d.title}</a></h3>;
					})}
				</div>
			</div>
		);
	}
});
var dateStyle = {
	fontFamily: 'HelveticaNeue-Light',
	fontSize: '10px',
	color: '#666666',
	letterSpacing: '0.91px',
	lineHeight: '12px'
};
var categoryStyle = {
	background: '#19BBF1',
	borderRadius: '5px',
	minWidth: 55,
	padding: '0 10px',
	height: 26,
	float: 'right',
	margin: '0 2px',
	lineHeight: '26px',
	textAlign: 'center',
	textTransform: 'uppercase',
	color: 'white',
	maxWidth: 77
};
var authorStyle = {
	fontFamily: 'HelveticaNeue',
	fontSize: 10,
	color: '#666666',
	lineHeight: '24px'	
};
var titleStyle = {
	fontFamily: 'ThaiSansNeue',
	fontSize: '26px',
	color: '#212121',
	letterSpacing: '0.02px',
	lineHeight: '27px',
	marginTop: 12
};
var descriptionStyle = {
	fontFamily: 'ThaiSansNeue',
	fontSize: '18px',
	color: '#000000',
	fontWeight: 100,
	lineHeight: '19.1px'
};
var SmallItem = React.createClass({
	render: function() {
		var d = this.props.data;
		var author = {
    	title: d.user.fullname,
    	avatar: '/images/author.jpg'
    };
    var itemHeight = this.props.height;
		return (
			<div style={{height: itemHeight, position: 'relative', padding: 6, borderBottom: '1px solid #C0C0C0'}}>				
				<ArticleImage article={d} width={itemHeight - 12} height={itemHeight - 12} style={{border: '1px solid #979797'}}/>
				<div style={{position: 'absolute', left: itemHeight, top: 6, bottom: 6, right: 6}}>
					<p style={dateStyle}>{moment(d.publishedDate).format('DD MMMM YYYY')}</p>
					<h3 style={_.extend({}, titleStyle, {fontSize: 18, lineHeight: '16px'})}>{d.title}</h3>
					<div style={_.extend({position: 'absolute', left: 0, bottom: 0, right: 0}, authorStyle)}>
						<img src={author.avatar} height="24" width="24" style={{borderRadius: '50%', float: 'left'}}/>
						<span style={{marginLeft: 7, maxWidth: 80, overflow: 'hidden', float: 'left', height: 24, whiteSpace: 'nowrap', textOverflow: 'ellipsis'}}>{author.title}</span>
						{d.categories && d.categories[0] && <div style={categoryStyle}>{d.categories[0]}</div>}
					</div>
				</div>
			</div>
		);
	}
});
var SmallItemList = React.createClass({
	render: function() {
		var itemHeight = window.innerHeight/4;
		return (
			<div style={{background: 'white', width: '100%', height: '100%'}}>
				{this.props.data.map(d=><SmallItem key={d._id} height={itemHeight} data={d}/>)}
				<img src="/images/paging-navigator.png" width="40" height="40" style={{position: 'absolute', left: 10, top: 10}}/>
			</div>
		);
	}
});
var SmallAndLargeSection = React.createClass({
	render: function() {
		var itemHeight = 120;
		var imageHeight = (window.innerHeight - itemHeight) * 0.55;
		var author = {
    	title: this.props.data[0].user.fullname,
    	avatar: '/images/author.jpg'
    };
		return (
			<div style={{background: 'white', width: '100%', height: '100%'}}>
				<div style={{position: 'relative', borderBottom: '1px solid #C0C0C0', height: window.innerHeight - itemHeight}}>					
					<ArticleImage article={this.props.data[0]} width={window.innerWidth} height={imageHeight} style={{position: 'relative'}}/>
					<div style={{position: 'absolute', left: 12, right: 12, top: imageHeight, bottom: 30, overflow: 'hidden'}}>
						<p style={_.extend({}, dateStyle, {marginTop: 6})}>{moment(this.props.data[0].publishedDate).format('DD MMMM YYYY')}</p>
						<h3 style={_.extend({}, titleStyle, {fontSize: 26, lineHeight: '27px', marginBottom: 5, marginTop: 6, maxHeight: 27 * 2, overflow: 'hidden'})}>{this.props.data[0].title}</h3>
						<p style={_.extend({}, descriptionStyle, {maxHeight: 19.1 * 2, overflow: 'hidden'})}>{this.props.data[0].description}</p>
					</div>
					<div style={_.extend({position: 'absolute', left: 6, bottom: 6, right: 6}, authorStyle)}>
						<img src={author.avatar} height="24" width="24" style={{borderRadius: '50%', float: 'left'}}/>
						<span style={{marginLeft: 7, maxWidth: 80, overflow: 'hidden', float: 'left', height: 24, whiteSpace: 'nowrap', textOverflow: 'ellipsis'}}>{author.title}</span>
						{this.props.data[0].categories && this.props.data[0].categories[0] && <div style={categoryStyle}>{this.props.data[0].categories[0]}</div>}
					</div>
				</div>
				<SmallItem key={this.props.data[1]._id} height={itemHeight} data={this.props.data[1]}/>
				<img src="/images/paging-navigator.png" width="40" height="40" style={{position: 'absolute', left: 10, top: 10}}/>
			</div>
		);
	}
});
var HighlightItem = React.createClass({
  getAuthor: function() {
    return {
    	title: this.props.data.user.fullname,
    	avatar: '/images/author.jpg'
    }
  },
	render: function() {
		var header = this.props.header;
		var headerStyle = {
			fontFamily: 'Antonio, Open Sans',
			fontWeight: 'bold',
			fontSize: 55,
			color: '#FFFFFF',
			lineHeight: '61px',
			position: 'absolute',
			// top: '50%',
			// marginTop: -30
			top: 90,
			textTransform: 'uppercase',
			width: '50%',
			left: 12,
		};				
		var triangle = <div style={{
			width: 0,
			height: 0,
			position: 'absolute',
			bottom: '50%',
			borderStyle: 'solid',
			borderWidth: '24px 0 0 ' + window.innerWidth + 'px',
			borderColor: 'transparent transparent transparent #ffffff',
		}}/>
		var author = this.getAuthor();			
		return (
			<div style={{background: 'white', width: '100%', height: '100%'}}>				
				<ArticleImage article={this.props.data} width={window.innerWidth} height={window.innerHeight/2} style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '50%'
				}}>
					{header && [<div key="dim" style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
						background: 'rgba(0,0,0,0.44)'
					}}/>,
					<h1 key="header" style={headerStyle}>{header}</h1>]}
				</ArticleImage>
				<img src="/images/paging-navigator.png" width="40" height="40" style={{position: 'absolute', left: 10, top: 10}}/>
				{triangle}
				<div style={{
					position: 'absolute',
					left: 13,
					right: 13,
					top: '50%',
					paddingTop: 5,
					bottom: 0
				}}>
					<p key="date" style={dateStyle}>{moment(this.props.data.publishedDate).format('DD MMMM YYYY')}</p>
					<h2 style={titleStyle}>{this.props.data.title}</h2>
					<p key="description" style={descriptionStyle}>{this.props.data.description}</p>
					<div style={_.extend({
						position: 'absolute',
						left: 0,
						right: 0,
						bottom: 12
					}, authorStyle)}>
						<img src={author.avatar} height="24" width="24" style={{borderRadius: '50%', float: 'left'}}/>
						<span style={{marginLeft: 7}}>{author.title}</span>
						{this.props.data.categories.map((c)=><div key={this.props.data._id + '-' + c} style={categoryStyle}>{c}</div>)}
					</div>
				</div>
			</div>
		);
	}
});
var getData = function(data, number, removeFromOriginal) {	
	var result = [];
	for (var i = 0; i < number; i++) {
		if (data.length === 0) {
			return result;
		}
		if (removeFromOriginal){
			result.push(data.splice(0, 1)[0]);
		} else {
			result.push(data[0]);
		}
	}
	return result;
};
var getCategoryData = function(data, category, number, removeFromOriginal) {	
	var result = [];
	for (var i = 0; i < data.length; i++) {
		var c = data[i].categories[0];
		if (c.toLowerCase() === category.toLowerCase()) {
			if (removeFromOriginal){
				result.push(data.splice(i, 1)[0]);
			} else {
				result.push(data[i]);
			}
			if (result.length >= number) {
				return result;
			}
		}
	}
	return result;
};
var getUniqCategoryData = function(data, number, removeFromOriginal) {
	var uniq_cats = [];
	var result = [];
	for (var i = 0; i < data.length; i++) {
		var c = data[i].categories[0];
		if (uniq_cats.indexOf(c) < 0) {
			uniq_cats.push(c);
			if (removeFromOriginal){
				result.push(data.splice(i, 1)[0]);
			} else {
				result.push(data[i]);
			}
			if (result.length >= number) {
				return result;
			}
		}
	}
	return result;
};
module.exports = React.createClass({
	componentDidMount: function() {
		window.addEventListener('resize', ()=> {
			this.forceUpdate();
		});
	},
	openCategoryPage: function(info) {
		var pageName = 'c-' + info.categories[0].toLowerCase();
		this.openPageName(pageName);
	},
	openArticlePage: function(info) {
		var pageName = 'c-' + info.categories[0].toLowerCase() + '-a-' + info._id;
		this.openPageName(pageName);
	},
	openPageName: function(pageName) {
		var page, pageIndex;
		var player = this.refs.player;
		var pages = player.props.children;
		for (var i = 0; i < pages.length; i++) {
			if (pages[i].props.name && pages[i].props.name.toLowerCase() === pageName) {
				page = pages[i];
				pageIndex = i;
				break;
			}
		}		
		if (page) {
			player.changeToPageIndex(pageIndex);
		}
	},
	render: function() {
		var data = Array.prototype.slice.call(this.props.data);
		var Player = IsMobile()? MobilePlayer: DesktopPlayer;
		var result = [
			<CoverSection handleItemAction={this.openCategoryPage} background='/images/cover-mobile.jpg' data={getUniqCategoryData(data, 3, false)}/>,
			<HighlightItem key={'Featured'} header="Featured" name={"c-featured"} data={getCategoryData(data, 'Featured', 1, true)[0]}/>,
			<SmallAndLargeSection data={getData(data, 2, true)}/>
		];
		['Gear', 'Life', 'Sex', 'People', 'Style', 'Entertain'].forEach(function(c) {
			result.push(<CoverSection handleItemAction={this.openArticlePage} name={"c-" + c} ref={'cat-' + c.toLowerCase()} title={c} data={getCategoryData(data, c, 3, false)}/>);
			for (var i = 0; i < 3; i++) {
				var d = getCategoryData(data, c, 1, true)[0];
				result.push(<HighlightItem key={"c-" + c + "-a-" + d._id}  name={"c-" + c + "-a-" + d._id} data={d}/>);
			}
		}, this);
		result.push(<CoverSection title="Latest" data={getData(data, 3, false)}/>);
		while (data.length > 0) {
			result.push(<SmallItemList data={getData(data, 4, true)}/>);
		}
		// while (data.length > 0) {
		// 	result.push(<SmallItemList data={getData(data, 4)}/>);
		// }
		return React.createElement(Player, {children: result, ref: 'player'});
	}
});