<?php
/**
 * Title: Upsells
 * Slug: assembler/hidden-upsells
 * Inserter: no
 */
declare( strict_types = 1 );
?>

<!-- wp:group {"metadata":{"name":"Upsells","patternName":"assembler/hidden-upsells"},"align":"wide","className":"is-style-default","style":{"spacing":{"blockGap":"0","margin":{"top":"0","bottom":"0"}}},"layout":{"type":"default"}} -->
<div class="wp-block-group alignwide is-style-default" style="margin-top:0;margin-bottom:0">
	<!-- wp:woocommerce/product-collection {"queryId":0,"query":{"perPage":8,"pages":1,"offset":0,"postType":"product","order":"asc","orderBy":"title","search":"","exclude":[],"inherit":false,"taxQuery":[],"isProductCollectionBlock":true,"featured":false,"woocommerceOnSale":false,"woocommerceStockStatus":["instock","outofstock","onbackorder"],"woocommerceAttributes":[],"woocommerceHandPickedProducts":[],"filterable":false,"relatedBy":{"categories":true,"tags":true}},"tagName":"div","displayLayout":{"type":"carousel","columns":4,"shrinkColumns":true},"dimensions":{"widthType":"fill"},"collection":"woocommerce/product-collection/upsells","hideControls":["inherit","filterable"],"queryContextIncludes":["collection"],"__privatePreviewState":{"isPreview":true,"previewMessage":"Actual products will vary depending on the product being viewed."}} -->
	<div class="wp-block-woocommerce-product-collection">
		<!-- wp:group {"style":{"spacing":{"margin":{"top":"var:preset|spacing|40"}}},"layout":{"type":"default"}} -->
		<div class="wp-block-group" style="margin-top:var(--wp--preset--spacing--40)">
			<!-- wp:group {"layout":{"type":"flex","justifyContent":"space-between","verticalAlignment":"center","flexWrap":"nowrap","orientation":"horizontal"}} -->
			<div class="wp-block-group">
				<!-- wp:heading -->
				<h2 class="wp-block-heading"><?php esc_html_e('You might also like', 'assembler');?></h2>
				<!-- /wp:heading -->

				<!-- wp:woocommerce/product-gallery-large-image-next-previous {"layout":{"type":"flex","flexWrap":"nowrap"}} -->
				<div class="wp-block-woocommerce-product-gallery-large-image-next-previous"></div>
				<!-- /wp:woocommerce/product-gallery-large-image-next-previous -->
			</div>
			<!-- /wp:group -->

			<!-- wp:woocommerce/product-template {"layout":{"type":"flex","justifyContent":"left","verticalAlignment":"top","flexWrap":"nowrap","orientation":"horizontal"}} -->
				<!-- wp:woocommerce/product-image {"showSaleBadge":false,"isDescendentOfQueryLoop":true,"style":{"dimensions":{"aspectRatio":"1"}}} -->
					<!-- wp:woocommerce/product-sale-badge /-->
				<!-- /wp:woocommerce/product-image -->

				<!-- wp:post-title {"level":3,"isLink":true,"style":{"spacing":{"margin":{"bottom":"0","top":"1rem"}}},"__woocommerceNamespace":"woocommerce/product-collection/product-title"} /-->

				<!-- wp:group {"style":{"spacing":{"blockGap":"0","margin":{"top":"0.625rem"}}},"layout":{"type":"flex","orientation":"vertical","justifyContent":"stretch"}} -->
				<div class="wp-block-group" style="margin-top:0.625rem">
					<!-- wp:woocommerce-bookings/booking-duration /-->

					<!-- wp:woocommerce/product-price {"isDescendentOfQueryLoop":true} /-->
				</div>
				<!-- /wp:group -->
			<!-- /wp:woocommerce/product-template -->
		</div>
		<!-- /wp:group -->
	</div>
	<!-- /wp:woocommerce/product-collection -->
</div>
<!-- /wp:group -->
