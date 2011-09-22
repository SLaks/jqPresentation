#jqPresentation

jqPresentation is a jQuery plugin that creates PowerPoint-style slideshows from web pages.

#Features
 - Reads semantic, standards-compliant HTML
 - Supports jQuery UI animations
 - Tracks current position in the address bar for browser navigation support

#Controls
 - Press Up or Down to navigate by one item
 - Press Page Up or Page Down to navigate by one slide
 - Press Home or End to jump the the beginning or the end of the entire presentation
 - Use the scroll wheel to navigate by one item (requires mousewheel plugin)

##[Demo](http://jqPresentation.slaks.net/Introducing-jQuery)

#Dependencies
 - [jQuery](http://jquery.com)
 - [hashchange plugin](https://github.com/cowboy/jquery-hashchange/)
##Optional:
 - [jQuery UI effects](http://jqueryui.com)  (for additional item animations)
 - [mousewheel plugin](https://github.com/brandonaaron/jquery-mousewheel) (for scroll wheel navigation)

#Instructions
Use the following markup:

    <article class="Presentation">
        <section class="Slide">
            <h1>Slide Title</h1>
            <p class="Item">
                This element will slide down when you click.
			</p>
		</section>
        <section class="Slide">
			...
		</section>
	</article>

Tag names don't matter; use whatever elements you like.  The contents of each slide also don't matter; slides can hold whatever you like.  By convention, all slides should have an `<h1>` containing a slide title; the standard ([blue](https://github.com/SLaks/jqPresentation/blob/master/Source/CSS/jqPresentation.Blue.css)) theme integrates the slide title into the slide design.

To create sequential animations within slides, add `class="Item"` to elements in the slide.  All `Item`s will be hidden when the slide is first entered, and will appear one by one as you navigate forwards.  
After creating your markup, call

	$('.Presentation').presentation();

If you add an ID to a slide or item, navigating to `YourPage#YourID` will automatically jump to that point.

If you use the [SyntaxHighlighter script](http://alexgorbatchev.com/SyntaxHighlighter/), you must include the following [compatibility hack](http://blog.slaks.net/2011/09/xregexp-breaks-jquery-animations.html) for jQuery:

    //http://blog.slaks.net/2011/09/xregexp-breaks-jquery-animations.html
    if (XRegExp) {
        var xExec = RegExp.prototype.exec;
        RegExp.prototype.exec = function (str) {
            if (!str.slice)
                str = String(str);
            return xExec.call(this, str);
        };
    }

You may also want my [SyntaxHighlighter theme](https://github.com/SLaks/jqPresentation/blob/master/Demos/SyntaxHighlighter/shCore.Blue.css) to match my standard blue presentation theme.

#Item Animations
You can apply different animations to items by setting the `data-animation` attribute (case-insensitive).  jqPresentation includes two animations: `fade` and `slideDown`.  If jQuery UI is present, all of its [effects](http://jqueryui.com/demos/effect/) are also available as animations.

You can create a custom animation like this:

	Presentation.animations.customeffect = {
		show: function(elem, callback) { ... },
		hide: function(elem, callback) { ... },
	);

The effect name must be lower case.  `elem` is a jQuery object containing a single element to animate, and `callback` must be called after the animation is complete.

A sample custom animation can be found at the end of the [Introducing jQuery presentation](https://github.com/SLaks/jqPresentation/blob/master/Demos/Introducing-jQuery/index.html#L1216).

#License
 Dual licensed under the MIT and GPL licenses, just like jQuery