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
	this.clear();
};
Presentation.Slide.prototype = {
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
			var item = self.items.eq(this.currentIndex); //Hide the previous item from before decrementing
			Presentation.getAnimation(item).hide(item, function () { self.doStep(); });
			this.updateHash();
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
			this.updateHash();
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
		this.updateHash();
	},

	clear: function () {
		/// <summary>Resets the slide and hides all items.</summary>
		if (this.currentIndex === 0) return;

		this.items.hide();
		this.targetIndex = this.currentIndex = 0;
		this.updateHash();
	},
	fill: function () {
		/// <summary>Finalizes the slide and shows all items.</summary>
		if (this.currentIndex === this.items.length) return;

		this.items.show();
		this.targetIndex = this.currentIndex = this.items.length;
		this.updateHash();
	},

	updateHash: function () {
		if (this.parent.currentSlide === this) {
			if (this.index === 0 && this.currentIndex === 0)
				location.hash = "";
			else {
				var hash = this.index.toString();
				if (this.currentIndex !== 0)
					hash += "/" + this.currentIndex;
				location.hash = hash;
			}
		}
	}
};

function Presentation(host) {
	if (!host) return; //Allow new Presentation() for IntelliSense hinting
	var self = this;
	this.host = $(host);
	this.slideElems = host.children('.Slide');
	this.slideElems.wrapAll('<div class="PresentationInner"> </div>');
	this.slider = this.slideElems.parent();

	this.slides = this.slideElems.map(function (index, elem) { return new Presentation.Slide(self, index, elem); }).get();

	this.slideElems.append(function (index, html) {
		return '<div class="SlideNumber">Slide ' + (index + 1) + " of " + self.slides.length
		//+ "; " + self.slides[index].items.length + " items!"
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

	$(window).resize(function () {
		self.updateSize();
		self.updateLayout(true);
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
		var r = self.parseHash();
		if (!r)
			return;
		if (r.slide !== self.currentSlide.index)	//Prevent reentrancy
			self.slideMoveTo(r.slide);
		self.currentSlide.jumpTo(r.item);
	});
}

Presentation.prototype = {
	host: $(),
	slideElems: $(),
	slides: [new Presentation.Slide()],
	slider: $(),
	currentSlide: new Presentation.Slide(),

	parseHash: function () {
		var match = /([0-9]+)\/?\s*([0-9]+)?/.exec(location.hash);
		if (!match) return false;
		return {
			slide: parseInt(match[1], 10),
			item: parseInt(match[2] || 0, 10)
		};
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
			this.updateLayout(true);

		this.currentSlide = this.slides[targetIndex];
		this.updateLayout(dontAnimate);
		this.currentSlide.updateHash();
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
