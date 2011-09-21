/// <reference path="../Dependencies/jquery-1.6.3-vsdoc.js" />
/// <reference path="../Dependencies/jquery.mousewheel.js" />
/// <reference path="../Dependencies/jquery.ba-hashchange.js" />
/// <reference path="../Dependencies/jquery-ui-1.8.16.effects.min.js" />

Presentation.Slide = function (parent, index, container) {
	/// <summary>A single slide in a presentation.</summary>

	if (!parent) return; //Allow new Presentation.Slide() for IntelliSense hinting

	this.parent = parent;
	this.index = index;
	this.container = $(container);
	this.items = this.container.find('.Item');
	this.items.after('<div style="clear: both"> </div>'); //Fix layout issue
	this.title = this.container.attr("title") || this.container.find(":header:first").text();

	this.clear();
};
Presentation.Slide.prototype = {
	title: '',
	parent: {},
	index: -1,
	container: $(),
	items: $(),
	currentIndex: -1, //The number of items currently displayed, may be [0, items.length]
	targetIndex: -1, 	//The number of items that should be displayed after animations finish
	isAnimating: false, //Whether the animation callback loop is running.  
	//If this is true, any changes to targetIndex will automatically be applied by the loop.
	//Otherwise, the loop needs to be started manually by calling doStep()

	doStep: function () {
		this.isAnimating = false; 	//This will be set to true in stepForward/stepBack before the animation starts

		if (this.targetIndex < 0)
			this.parent.slideMoveBy(-1);
		else if (this.targetIndex > this.items.length)
			this.parent.slideMoveBy(+1);

		else if (this.targetIndex < this.currentIndex)
			this.stepBack();
		else if (this.targetIndex > this.currentIndex)
			this.stepForward();
	},
	stepBack: function () {
		var self = this;
		if (this.currentIndex <= 0)
			this.parent.slideMoveBy(-1);
		else {
			this.isAnimating = true; //This will be set to false by doStep() in the completion callback

			this.currentIndex--;
			var item = this.items.eq(this.currentIndex); //Hide the previous item from before decrementing
			Presentation.getAnimation(item).hide(item, function () { self.doStep(); });
			this.parent.updateHash();
		}
	},
	stepForward: function () {
		var self = this;
		if (this.currentIndex > this.items.length)
			this.parent.slideMoveBy(+1);
		else {
			this.isAnimating = true; //This will be set to false by doStep() in the completion callback

			this.currentIndex++;
			var item = self.items.eq(this.currentIndex - 1);
			Presentation.getAnimation(item).show(item, function () { self.doStep(); });
			this.parent.updateHash();
		}
	},

	moveBy: function (offset) {
		this.moveTo(this.targetIndex + offset);
	},
	moveTo: function (index) {
		var self = this;

		if (index < 0)
			this.parent.slideMoveBy(-1);
		else if (index > this.items.length)
			this.parent.slideMoveBy(+1);
		else {
			this.targetIndex = index;
			if (!this.isAnimating)	//If we're already in the step callback loop, don't start another one
				this.doStep();
		}
	},
	jumpTo: function (index) {
		/// <summary>Instantly moves to the specified index.</summary>
		if (this.currentIndex === index) return;

		this.targetIndex = this.currentIndex = index;
		this.items.each(function (i, elem) {
			if (i < index)
				$(elem).show();
			else
				$(elem).hide();
		});
		this.parent.updateHash();
	},

	clear: function () {
		/// <summary>Resets the slide and hides all items.</summary>
		if (this.currentIndex === 0) return;

		this.items.hide();
		this.targetIndex = this.currentIndex = 0;
		this.parent.updateHash();
	},
	fill: function () {
		/// <summary>Finalizes the slide and shows all items.</summary>
		if (this.currentIndex === this.items.length) return;

		this.items.show();
		this.targetIndex = this.currentIndex = this.items.length;
		this.parent.updateHash();
	}
};

function Presentation(host) {
	if (!host) return; //Allow new Presentation() for IntelliSense hinting
	this.beginNavigation();

	var self = this;
	this.host = $(host);
	this.slideElems = host.children('.Slide');
	this.slideElems.wrapAll('<div class="PresentationInner"> </div>');
	this.slider = this.slideElems.parent();
	this.baseTitle = document.title;

	this.idMap = {};
	this.slides = this.slideElems.map(function (slideIndex, elem) {
		var slide = new Presentation.Slide(self, slideIndex, elem);

		if (elem.id)
			self.idMap[elem.id] = { slide: slideIndex, item: 0 };

		slide.items.each(function (itemIndex) {
			//An item ID maps to the subsequent index - the index of the next item to show
			if (this.id)
				self.idMap[this.id] = { slide: slideIndex, item: itemIndex + 1 };
		});
		return slide;
	}).get();


	this.slideElems.append(function (index, html) {
		return '<div class="SlideNumber">Slide ' + (index + 1) + " of " + self.slides.length
			 + '</div>';
	});
	this.updateSize();

	var r = this.parseHash();
	if (!r)
		this.slideMoveTo(0, true);
	else {
		this.slideMoveTo(r.slide, true);
		self.currentSlide.jumpTo(r.item);
	}
	this.endNavigation("Don't Update");

	$(window).resize(function () {
		self.updateSize();
		self.updateLayout("Don't Animate");
	});

	if ($.fn.mousewheel) {	//If the mousewheel plugin is available, use it
		this.host.mousewheel(function (event, delta, deltaX, deltaY) {
			//Scroll wheel: Move items
			self.itemMoveBy(delta < 0 ? 1 : -1);
		});
	}

	$(document).keydown(function (e) {
		switch (e.keyCode) {
			//	//Page Up & Page Down: Move slides                                                                                                                                         
			case 33: self.slideMoveBy(-1); return false;
			case 34: self.slideMoveBy(+1); return false;

				//Arrows keys: Move items
			case 37: case 38: self.itemMoveBy(-1); return false;
			case 39: case 40: self.itemMoveBy(+1); return false;
				//Home & End: Move absolutely
			case 36: self.slideMoveTo(+0); return false;
			case 35: //When pressing End twice, show everything on the last slide.
				if (self.currentSlide.index === self.slides.length - 1)
					self.currentSlide.moveTo(self.currentSlide.items.length);
				else
					self.slideMoveTo(-1);
				return false;
		}
	});
	$(window).hashchange(function () {
		self.beginNavigation();
		var r = self.parseHash();
		if (r.slide !== self.currentSlide.index)	//Prevent reentrancy
			self.slideMoveTo(r.slide);
		self.currentSlide.jumpTo(r.item);
		self.endNavigation("Don't Update");
	});
}

Presentation.prototype = {
	host: $(),
	slideElems: $(),
	slides: [new Presentation.Slide()],
	slider: $(),
	currentSlide: new Presentation.Slide(),
	baseTitle: '',
	hashSuppressionCount: 0,

	parseHash: function () {
		//If the hash is just an ID, use that
		//That means a slide ID with no item,
		//or an item ID.
		var idMatch = this.idMap[location.hash.substr(1)]; //Remove the #
		if (idMatch)
			return idMatch;

		//It's [Slide-ID|Slide-Index](/Item-Index)?
		var match = /^#(?:([A-Za-z][A-Za-z0-9_.:-]*)|([0-9]+))(?:\/\s*([0-9]+))?$/.exec(location.hash);
		if (!match)
			return { slide: 0, item: 0 };

		//match[1] is the Slide-ID or undefined
		//match[2] is the Slide-Index (can be 0) or undefined
		//If match[2] is 0, it's valid but falsy.
		//match[1] cannot be valid but falsy.

		return {
			slide: match[1] ? this.idMap[match[1]].slide : parseInt(match[2], 10),
			item: parseInt(match[3] || 0, 10)
		};
	},
	beginNavigation: function () { this.hashSuppressionCount++; },
	endNavigation: function (dontUpdate) {
		this.hashSuppressionCount--;
		if (!dontUpdate)
			this.updateHash();
	},
	getHash: function () {
		var slide = this.currentSlide;
		if (slide.index === 0 && slide.currentIndex === 0)
			return ""; 				//If we're all the way at the beginning, there is no hash

		var slideId = slide.container[0].id || slide.index;

		if (slide.currentIndex === 0)	//If currentIndex is 0, there are no items yet, so we just return the slide ID
			return slideId;

		//If the previous item has an ID, use that
		//We use the ID of the last item visible, 
		//but the index of the next item to show
		//(which looks like the one-based index of
		//the last visible item)
		return slide.items[slide.currentIndex - 1].id || (slideId + "/" + slide.currentIndex);
	},
	updateHash: function () {
		if (this.hashSuppressionCount) return;

		var hash = this.getHash();
		if (location.hash === "#" + hash) return;

		console && console.log("Moving from " + location.hash + " to #" + hash);

		var oldWX = $(window).scrollLeft();
		var oldPX = this.host.scrollLeft();
		//Only create a new history entry when switching slides.
		if (this.parseHash().slide === this.currentSlide.index)
			location.replace("#" + hash);
		else
			location.hash = hash;

		this.host.scrollLeft(oldPX); //Suppress any scrolling that resulted from the hash navigation
		$(window).scrollLeft(oldWX);
	},


	updateSize: function () {
		var hBorderSize = this.slideElems.outerWidth(false) - this.slideElems.width();
		var vBorderSize = this.slideElems.outerHeight(false) - this.slideElems.height();

		this.slideElems.css({
			width: (this.host.width() * .85) - hBorderSize,
			height: (this.host.height() * .85) - vBorderSize,

			margin: this.host.height() * .075 + "px " + this.host.width() * .02 + "px"
		});
	},

	slideMoveBy: function (offset) {
		if (this.currentSlide.index + offset >= 0)
			this.slideMoveTo(this.currentSlide.index + offset)
	},

	slideMoveTo: function (targetIndex, dontAnimate) {
		if (targetIndex < 0)	//Wraparound
			targetIndex = this.slides.length + (targetIndex % this.slides.length);

		var target = this.slides[targetIndex];
		if (!target) return;

		this.beginNavigation();
		//To prevent positions from overflowing, hide unnecessary slides
		//If we're jumping very far, hide some slides in the middle too.
		var min = Math.min(this.currentSlide.index, targetIndex);
		var max = Math.max(this.currentSlide.index, targetIndex);

		//Fill everything until the target; clear the target and everything after it.
		for (var i = 0; i < this.slides.length; i++) {
			if (i < targetIndex
			|| (i === targetIndex && targetIndex < this.currentSlide.index))	//If we came backwards to a slide, leave it full
				this.slides[i].fill();
			else
				this.slides[i].clear();

			if ((i < min - 1 || i > max + 1)	//If this slide is outside the range in which we're moving (and not immediately adjacent)
			 || (i > min + 5 && i < max - 5))	//If this slide is in the middle of a large range
				this.slides[i].container.hide();
			else
				this.slides[i].container.show();
		}
		//Before starting the animation, update the position immediately to account for hidden slides
		if (!dontAnimate)
			this.updateLayout("Don't Animate");

		this.currentSlide = this.slides[targetIndex];
		this.updateLayout(dontAnimate);

		if (this.currentSlide.title)
			document.title = this.baseTitle + " - " + this.currentSlide.title;
		else
			document.title = this.baseTitle;
		this.updateHash();
		this.endNavigation();
	},

	updateLayout: function (dontAnimate) {
		var targetPos = (this.host.width() - this.currentSlide.container.outerWidth(true)) / 2
					  - this.currentSlide.container.position().left;
		if (dontAnimate)
			this.slider.stop().css({ left: targetPos });
		else
			this.slider.stop().animate({ left: targetPos });
	},

	itemMoveBy: function (offset) {
		this.currentSlide.moveBy(offset);
	}
};
var speed = 500;
Presentation.animations = {
	fade: { show: function (item, callback) { item.fadeIn(speed, callback); }, hide: function (item, callback) { item.fadeOut(speed, callback); } },
	slideVertical: { show: function (item, callback) { item.slideDown(speed, callback); }, hide: function (item, callback) { item.slideUp(speed, callback); } }
};
Presentation.animations.standard = Presentation.animations.slideVertical;

//If jQuery UI is present, add its effects
if ($.effects) {
	$.each($.effects, function (name, func) {
		Presentation.animations[name.toLowerCase()] = {
			show: function (item, callback) { item.show(name, speed, callback); },
			hide: function (item, callback) { item.hide(name, speed, callback); }
		};
	});
	Presentation.animations.standard = Presentation.animations.blind;
}
Presentation.getAnimation = function (item, fallback) {
	var name = item.data('animation');
	var anim;

	if (name) {
		anim = Presentation.animations[name.toLowerCase()];
		if (!anim || !anim.show) {
			anim = null;
			console && console.error("Missing " + name + "!");
		}
	}
	return anim || fallback || Presentation.animations.standard;
};
$.fn.presentation = function () {
	var existing = this.data('presentation');
	if (existing) return existing;

	var obj = new Presentation(this);
	this.data('presentation', obj);

	return obj;
};
