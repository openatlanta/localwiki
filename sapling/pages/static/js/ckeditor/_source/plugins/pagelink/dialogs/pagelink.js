/*
Sapling pagelink dialog
*/

CKEDITOR.dialog.add( 'pagelink', function( editor )
{
	var plugin = CKEDITOR.plugins.pagelink;

	// Loads the parameters in a selected link to the link dialog fields.
	var javascriptProtocolRegex = /^javascript:/,
		emailRegex = /^mailto:([^?]+)(?:\?(.+))?$/,
		emailSubjectRegex = /subject=([^;?:@&=$,\/]*)/,
		emailBodyRegex = /body=([^;?:@&=$,\/]*)/,
		anchorRegex = /^#(.*)$/,
		urlRegex = /^((?:http|https|ftp):\/\/)?(.+)$/;

	var parseLink = function(href)
	{
		var javascriptMatch,
			emailMatch,
			anchorMatch,
			urlMatch,
			retval = {};
			
		if ( ( anchorMatch = href.match( anchorRegex ) ) )
		{
			retval.type = 'anchor';
			retval.anchor = {};
			retval.anchor.name = retval.anchor.id = anchorMatch[1];
		}
		// Protected email link as encoded string.
		else if ( ( emailMatch = href.match( emailRegex ) ) )
		{
			var subjectMatch = href.match( emailSubjectRegex ),
				bodyMatch = href.match( emailBodyRegex );

			retval.type = 'email';
			var email = ( retval.email = {} );
			email.address = emailMatch[ 1 ];
			subjectMatch && ( email.subject = decodeURIComponent( subjectMatch[ 1 ] ) );
			bodyMatch && ( email.body = decodeURIComponent( bodyMatch[ 1 ] ) );
			retval.url = 'mailto:' + email.address;
		}
		// urlRegex matches empty strings, so need to check for href as well.
		else if (  ( urlMatch = href.match( urlRegex ) ) )
		{
			retval.type = 'url';
			retval.url = href;
		}
		else
		{
			retval.type = 'page';
			retval.url = href;
		}
		
		return retval;
	}
	var processLink = function( editor, element )
	{
		var href = ( element  && element.getAttribute( 'href' ) ) || '';

		var retval = parseLink(href);
		
		// Find out whether we have any anchors in the editor.
		// Get all IMG elements in CK document.
		var elements = editor.document.getElementsByTag( 'img' ),
			realAnchors = new CKEDITOR.dom.nodeList( editor.document.$.anchors ),
			anchors = retval.anchors = [];

		for ( var i = 0; i < elements.count() ; i++ )
		{
			var item = elements.getItem( i );
			if ( item.data( 'cke-realelement' ) && item.data( 'cke-real-element-type' ) == 'anchor' )
				anchors.push( editor.restoreRealElement( item ) );
		}

		for ( i = 0 ; i < realAnchors.count() ; i++ )
			anchors.push( realAnchors.getItem( i ) );

		for ( i = 0 ; i < anchors.length ; i++ )
		{
			item = anchors[ i ];
			anchors[ i ] = { name : item.getAttribute( 'name' ), id : item.getAttribute( 'id' ) };
		}

		// Record down the selected element in the dialog.
		this._.selectedElement = element;

		return retval;
	};

	var setupParams = function( page, data )
	{
		if ( data[page] )
			this.setValue( data[page][this.id] || '' );
	};

	var commitParams = function( page, data )
	{
		if ( !data[page] )
			data[page] = {};

		data[page][this.id] = this.getValue() || '';
	};

	function unescapeSingleQuote( str )
	{
		return str.replace( /\\'/g, '\'' );
	}

	function escapeSingleQuote( str )
	{
		return str.replace( /'/g, '\\$&' );
	}


	var commonLang = editor.lang.common,
		linkLang = editor.lang.link;

	return {
		title : linkLang.title,
		minWidth : 250,
		minHeight : 120,
		contents : [
			{
				id : 'info',
				label : linkLang.info,
				title : linkLang.info,
				elements :
				[
					{
						type : 'text',
						id : 'url',
						label : 'Page name or URL',
						required: true,
						onLoad : function ()
						{
							this.allowOnChange = true;
						},
						onKeyUp : function()
						{
							this.allowOnChange = false;
							// TODO: suggest pages as-you-type

							this.allowOnChange = true;
						},
						onChange : function()
						{
							if ( this.allowOnChange )		// Dont't call on dialog load.
								this.onKeyUp();
						},
						validate : function()
						{
							//var dialog = this.getDialog();

							//var func = CKEDITOR.dialog.validate.notEmpty( linkLang.noUrl );
							//return func.apply( this );
						},
						setup : function( data )
						{
							this.allowOnChange = false;
							if ( data.url )
								this.setValue( data.url );
							this.allowOnChange = true;

						},
						commit : function( data )
						{
							data.url = this.getValue();
							this.allowOnChange = false;
						}
					}
				]
			}
		],
		onShow : function()
		{
			var editor = this.getParentEditor(),
				selection = editor.getSelection(),
				element = null;

			// Fill in all the relevant fields if there's already one link selected.
			if ( ( element = plugin.getSelectedLink( editor ) ) && element.hasAttribute( 'href' ) )
				selection.selectElement( element );
			else
				element = null;
			this.setupContent( processLink.apply( this, [ editor, element ] ) );
		},
		onOk : function()
		{
			var attributes = {},
				removeAttributes = [],
				data = {},
				me = this,
				editor = this.getParentEditor();

			this.commitContent( data );
			data = parseLink(data.url);

			// Compose the URL.
			switch ( data.type || 'page' )
			{
				default:
					var url = data.url || '';
					attributes[ 'href' ] = url;
			}

			if ( !this._.selectedElement )
			{
				if(data.url == '')
					return;
				// Create element if current selection is collapsed.
				var selection = editor.getSelection(),
					ranges = selection.getRanges( true );
				if ( ranges.length == 1 && ranges[0].collapsed )
				{
					// Short mailto link text view (#5736).
					var text = new CKEDITOR.dom.text( data.type == 'email' ?
							data.email.address : attributes[ 'href' ], editor.document );
					ranges[0].insertNode( text );
					ranges[0].selectNodeContents( text );
					selection.selectRanges( ranges );
				}

				// Apply style.
				var style = new CKEDITOR.style( { element : 'a', attributes : attributes } );
				style.type = CKEDITOR.STYLE_INLINE;		// need to override... dunno why.
				style.apply( editor.document );
			}
			else
			{
				// We're only editing an existing link, so just overwrite the attributes.
				var element = this._.selectedElement,
					href = element.getAttribute( 'href' ),
					textView = element.getHtml();

				element.setAttributes( attributes );
				element.removeAttributes( removeAttributes );
				// Update text view when user changes protocol (#4612).
				if ( href == textView || data.type == 'email' && textView.indexOf( '@' ) != -1 )
				{
					// Short mailto link text view (#5736).
					element.setHtml( data.type == 'email' ?
						data.email.address : attributes[ 'href' ] );
				}

				delete this._.selectedElement;
				if(jQuery.trim(data.url) == '')
					jQuery(element.$).after(jQuery(element.$).html()).remove();
			}
		},
		onLoad : function()
		{
		},
		// Inital focus on 'url' field if link is of type URL.
		onFocus : function()
		{
			var urlField = this.getContentElement( 'info', 'url' );
			urlField.select();
		}
	};
});
