// This dotenv import is required for the `.env` file to be read
require('dotenv').config();

const PER_PAGE = 100;

const flexIntegrationSdk = require('sharetribe-flex-integration-sdk');

const integrationSdk = flexIntegrationSdk.createInstance({

  // These two env vars need to be set in the `.env` file.
  clientId: process.env.FLEX_INTEGRATION_CLIENT_ID,
  clientSecret: process.env.FLEX_INTEGRATION_CLIENT_SECRET,

  // Normally you can just skip setting the base URL and just use the
  // default that the `createInstance` uses. We explicitly set it here
  // for local testing and development.
  baseUrl: process.env.FLEX_INTEGRATION_BASE_URL || 'https://flex-api.sharetribe.com',
});

const totalItems = response => {
  return response.data.meta.totalItems;
};

const allPages = response => {
  return response.data.meta.totalPages;
}

const allItems = response => {
  const array = response.data;
  return array;
}

const getTotals = async () => {
  // Let's query minimal data of different resources to get basic totals.
  const minimalOptions = {
    'fields.listing': 'none',
    perPage: PER_PAGE,
  };

  return Promise.all([
    integrationSdk.marketplace.show(),

    // Listings
    integrationSdk.listings.query(minimalOptions),

    // Listings in published state
    integrationSdk.listings.query({
      states: ['published'],
      ...minimalOptions,
    }),

  ]).then(([
    marketplace,
    listings,
    publishedListings,
  ]) => {
    const { name } = marketplace.data.data.attributes;
    const totalPages = allPages(publishedListings);

    console.log('');
    console.log('');
    console.log(`================ ${name} analytics ================`);
    console.log('');
    console.log(`Listings: ${totalItems(listings)}`);
    console.log(`Published Listings: ${totalItems(publishedListings)}`);
    console.log("Total Pages: " + totalPages);
    return totalPages;
  })
}

const getListingsOnPage = async (pageNumber) => {
  // Let's query all data.
  const pageOptions = {
    'fields.listings': 'none',
    perPage: PER_PAGE,
    page: pageNumber
  };

  return Promise.all([
    // Listings in published state
    integrationSdk.listings.query({
      states: ['published'],
      ...pageOptions,
    }),

  ]).then(([
    pageListings,
  ]) => {
    const array = allItems(pageListings);
    console.log('');
    console.log('');
    console.log("================ Loading Page " + pageNumber + "================");
    console.log('');
    return array.data;
  })
}
const getAllListings = async () => {
  let listings = [];
  const totalPages = await getTotals();
  for (var i = 1; i <= totalPages; i++) {
    listings = listings.concat(await getListingsOnPage(i));
  }
  return listings;
}

const updateListings = async () => {
  const listings = await getAllListings();

  listings.forEach(function updateListing(l, i) {
    const userId = l.id;
    const allowsInternationalOrders = l.attributes.publicData.allowsInternationalOrders &&
      l.attributes.publicData.allowsInternationalOrders[0] === "hasFee";
    const emptyInternationalOrders = l.attributes.publicData.allowsInternationalOrders &&
      l.attributes.publicData.allowsInternationalOrders.length === 0;
    if (allowsInternationalOrders || emptyInternationalOrders) {
      console.log("Updating: " + l.attributes.title);
      integrationSdk.listings.update(
        {
          id: userId,
          publicData: {
            allowsInternationalOrders: allowsInternationalOrders ? true : false
          },
        },
        {
          expand: true,
        })
        .catch(() => {
          console.log("Could not update: " + l.title);
        }
        );
    }
  });
}

updateListings();