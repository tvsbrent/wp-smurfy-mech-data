/**
 * Created by Brent on 1/30/2015.
 */
jQuery(document).ready( function() {
  jQuery('.dsmd-expander').on( 'click', function() {
    var expander = jQuery(this);
    expander.closest('.dsmd-container').toggleClass('dsmd-container-expanded');
    if(expander.hasClass('dsmd-arrow-down'))
    {
      expander.removeClass('dsmd-arrow-down');
      expander.addClass('dsmd-arrow-up');
    }
    else
    {
      expander.removeClass('dsmd-arrow-up');
      expander.addClass('dsmd-arrow-down');
    }
  } );
} );