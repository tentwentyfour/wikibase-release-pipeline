'use strict';

const Util = require( 'wdio-mediawiki/Util' );
const assert = require( 'assert' );
const WikibaseApi = require( 'wdio-wikibase/wikibase.api' );
const LoginPage = require( 'wdio-mediawiki/LoginPage' );
const querystring = require( 'querystring' );
const fs = require( 'fs' );
const defaultFunctions = require( '../../helpers/default-functions' );

const itemLabel = Util.getTestString( 'The Item' );

describe( 'Item', function () {

	let itemId = null;
	let propertyId = null;
	const propertyValue = 'PropertyExampleStringValue';
	const pageTitle = 'Test';

	before( function () {
		defaultFunctions();
	} );

	it( 'Special:NewItem should not be accessible on client', function () {

		browser.url( process.env.MW_CLIENT_SERVER + '/wiki/Special:NewItem?uselang=qqx' );
		$( 'h1#firstHeading' ).waitForDisplayed();
		const notFoundText = $( 'h1#firstHeading' ).getText();
		assert( notFoundText === '(nosuchspecialpage)' );
	} );

	it( 'Special:NewItem should be visible on repo', function () {

		browser.url( process.env.MW_SERVER + '/wiki/Special:NewItem?uselang=qqx' );
		$( 'h1#firstHeading' ).waitForDisplayed();
		const createNewItem = $( 'h1#firstHeading' ).getText();
		assert( createNewItem === '(special-newitem)' );
	} );

	it( 'Should create an item on repo', function () {

		propertyId = browser.call( () => WikibaseApi.createProperty( 'string' ) );
		const data = {
			claims: [
				{
					mainsnak: {
						snaktype: 'value',
						property: propertyId,
						datavalue: { value: propertyValue, type: 'string' } },
					type: 'statement', rank: 'normal'
				}
			]
		};

		itemId = browser.call(
			() => WikibaseApi.createItem( itemLabel, data )
		);

		browser.url( process.env.MW_SERVER + '/wiki/Item:' + itemId );
		$( '.wikibase-toolbarbutton.wikibase-toolbar-item.wikibase-toolbar-button.wikibase-toolbar-button-add' ).waitForDisplayed();
	} );

	// creates usage
	it( 'Should be able to use the item on client with wikitext', function () {

		browser.pause( 10 * 1000 );

		const bodyText = browser.editPage(
			process.env.MW_CLIENT_SERVER,
			pageTitle, '{{#statements:' + propertyId + '|from=' + itemId + '}}'
		);
		// label should come from repo property
		assert( bodyText.includes( propertyValue ) );
	} );

	// This will generate a change that will dispatch
	it( 'Should be able to create site-links from item to client', function () {

		// Create a site-link on a the Main_Page
		browser.url( process.env.MW_SERVER + '/wiki/Special:SetSiteLink/Q1?site=client_wiki&page=' + pageTitle );
		$( '#wb-setsitelink-submit button' ).waitForDisplayed();
		$( '#wb-setsitelink-submit button' ).click();

		$( '.wikibase-sitelinklistview-listview li' ).waitForDisplayed();

		const siteLinkValue = $( '.wikibase-sitelinklistview-listview li' ).getText();

		// label should come from repo property
		assert( siteLinkValue.includes( 'client_wiki' ) && siteLinkValue.includes( pageTitle ) );

	} );

	it( 'Should be able to see site-link change is dispatched to client', function () {

		browser.pause( 30 * 1000 );

		const expectedSiteLinkChange = {
			type: 'external',
			ns: 0,
			title: pageTitle,
			comment: 'A Wikidata item has been linked to this page.'
		};

		browser.assertChangeDispatched( process.env.MW_CLIENT_SERVER, expectedSiteLinkChange );
	} );

	it( 'Should be able to reference an item on client using Lua', function () {

		const template = fs.readFileSync( 'data/repo-client.lua', 'utf8' );
		const luaScript = template.replace( '<ITEM_ID>', itemId ).replace( '<LANG>', 'en' );
		console.log( luaScript );

		browser.editPage(
			process.env.MW_CLIENT_SERVER,
			'Module:RepoClient',
			luaScript
		);

		const executionContent = browser.editPage(
			process.env.MW_CLIENT_SERVER,
			'RepoClientLuaTest',
			'{{#invoke:RepoClient|testLuaExecution}}'
		);

		// should come from executed lua script
		assert( executionContent.includes( itemLabel ) );
	} );

	// This will generate a change that will dispatch
	it( 'Should be able to delete the item on repo', function () {

		LoginPage.loginAdmin();

		// goto delete page
		const query = { action: 'delete', title: 'Item:' + itemId };
		browser.url(
			browser.config.baseUrl + '/index.php?' +
			querystring.stringify( query )
		);

		$( '.oo-ui-flaggedElement-destructive button' ).waitForDisplayed();
		$( '.oo-ui-flaggedElement-destructive button' ).click();

		browser.url( process.env.MW_SERVER + '/wiki/Item:Q1' );
	} );

	it( 'Should be able to see delete changes is dispatched to client', function () {

		browser.pause( 30 * 1000 );

		const expectedDeletionChange = {
			type: 'external',
			ns: 0,
			title: pageTitle,
			comment: 'Associated Wikidata item deleted. Language links removed.'
		};

		browser.assertChangeDispatched( process.env.MW_CLIENT_SERVER, expectedDeletionChange );

	} );

} );
