import { createClient } from 'contentful';

const space = process.env.REACT_APP_CONTENTFUL_SPACE_ID;
const accessToken = process.env.REACT_APP_CONTENTFUL_DELIVERY_TOKEN;
const environment =
  process.env.REACT_APP_CONTENTFUL_ENVIRONMENT && process.env.REACT_APP_CONTENTFUL_ENVIRONMENT.trim()
    ? process.env.REACT_APP_CONTENTFUL_ENVIRONMENT
    : 'master';

let client = null;

if (space && accessToken) {
  client = createClient({
    space,
    environment,
    accessToken,
  });
} else {
  console.warn(
    'Contentful client is not configured. Please set REACT_APP_CONTENTFUL_SPACE_ID and REACT_APP_CONTENTFUL_DELIVERY_TOKEN.'
  );
}

export const fetchEntries = async (options = {}) => {
  if (!client) {
    throw new Error(
      'Contentful client is not configured. Ensure the required environment variables are set before building the UI.'
    );
  }

  try {
    const response = await client.getEntries(options);
    return response.items || [];
  } catch (error) {
    console.error('Contentful API error:', error);
    throw error;
  }
};

export default client;


