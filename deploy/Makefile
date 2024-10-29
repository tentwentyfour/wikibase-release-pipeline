setup-elastic:
	# Don't know how to call these from maintenance/run.php
	docker compose exec wikibase php extensions/CirrusSearch/maintenance/UpdateSearchIndexConfig.php --startOver
	docker compose exec wikibase php extensions/CirrusSearch/maintenance/ForceSearchIndex.php --skipParse
	docker compose exec wikibase php extensions/CirrusSearch/maintenance/ForceSearchIndex.php --skipLinks --indexOnSkip
