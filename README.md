# Overview

This is a simple javascript client for retrieving application configuration hosted remotely via a public URL. It provides slightly more functionality than just fetching a URL.

-   It can fallback to other endpoints looking for configuration
-   It can poll for configuration changes and notify your app if configuration has changed

> **This module is not intended for use with application secrets.** It is intended to retrieve base endpoint configuration, client ids, asset urls, text, feature flags, and other non-secret values that would be normally be available in your client's javascript source.

## Note

I will be testing this package on different platforms (react, react-native, electron, node) over the next few months and will maintain this repo for projects that I am involved with.

Feedback is welcome!

## Install

```bash
yarn add @pwningcode/remote-config-client
```

or

```bash
npm -i @pwningcode/remote-config-client
```

## Example pseudo code

```typescript
// For demonstration purposes
import { Hub } from 'aws-amplify';
import isEqual from 'lodash/isEqual';

// This package
import {
  ConfigClient,
  ConfigurationEvent,
  ConfigurationUndefinedError,
  FetchError,
} from '@pwningcode/remote-config-client';

// Provide a default configuration for local development
const developmentConfig = process.env.REACT_APP_IS_DEV
  ? {
      /* your development config here */
    }
  : undefined;

// Typescript
type ConfigType = typeof developmentConfig;

// For this example I am using clientId/version to construct a url to get the configuration
const clientId = 'YourAppsClientId';
const version = 'YourAppsVersion';

// Instantiate the client
const configurationClient = new ConfigClient<ConfigType>({
  // Required
  // The endpoints to load configuration from; can be a file, rest api, or whatever
  // Each endpoint is executed in order until one returns a value
  // If all endpoints fail, a ConfigurationFailedError is passed to the callback option
  endpoints: [
    `https://yourendpoint/appconfig/${clientId}/${version}.json`,
    `https://yourendpoint/appconfig/${clientId}/beta.json`,
    `https://yourendpoint/appconfig/default.json`,
  ],

  // Required
  // Called when the configuration is first loaded
  // or when the configuration is different from the previously loaded configuration
  // or when you call refresh()
  // or when all endpoints fail
  callback: (event: ConfigurationEvent) => {
    // In this context; status = error | loaded | updated
    if (event.status === 'error') {
      // This error only occurs if all endpoints fail
      console.log('All the endpoints failed', error.endpoints);
      return {
        /* You can return a default configuration here */
      };
    }

    // Example using AWS Amplify Hub to dispatch an event
    Hub.dispatch(
      `application-configuration-${event.status}`,
      event.configuration,
      `The configuration was ${event.status} from: ${event.endpoint}`,
    );

    // This allows you to alter the configuration before it is cached if needed.
    return event.configuration;
  },

  // Optional
  // Enables polling for configuration updates
  interval: 3600, // in seconds;

  // Optional
  // Call getConfiguration for you when initialized; which will call the callback
  // If the interval option is specified; this will start polling after the initial load
  initialize: true,

  // Optional
  // Load the following configuration and do not call the endpoints or enable polling
  // All other options (except the callback) are ignored if this is specified
  override: developmentConfig,

  // Optional
  // Use to persist the cache and/or override in-memory caching; helpful for offline support
  cache: {
    // Using localStorage as an example
    read: async () => {
      const data = localStorage.getItem(`${clientId}-${version}`);
      return data ? (JSON.parse(data) as ConfigType) : undefined;
    },
    write: async (config: ConfigType) => {
      const data = JSON.stringify(config);
      localStorage.setItem(`${clientId}-${version}`, data);
    },
  },

  // Optional
  // Use to replace, override, or enhance fetch
  // This is probably a good place to implement fetch-retry or change the content type
  fetch: async (url: string) => {
    // This is the default implementation
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.json();
  },

  // Optional
  // Override the default lodash/isEqual implementation to check if the configuration has changed
  equality: (source: ConfigType, target: ConfigType) => isEqual(source, target),

  // Optional
  // Transform the fetch result into something else before notifying your application
  transformer: (config: unknown) => config,

  // Optional
  // This gives you the ability to validate the configuration from an endpoint
  validator: (config: unknown) => Promise.resolve(),

  // Optional
  // Handle any errors thrown by the validator
  onValidationError: (error: unknown, config: unknown) => {
    console.warn(error, config);
  };

  // Optional
  // This is only called if the endpoint succeeds but the result from fetch is falsy (empty file or result)
  onConfigurationUndefined: (error: ConfigurationUndefinedError) => {
    console.warn(
      `The endpoint ${error.endpoint} succeeded but there is no content.`,
      error.error,
    );
  },

  // Optional
  // This is called for each fetch error while traversing endpoints
  // ie. Provides insight into bad endpoints (like when I forget to publish the configuration)
  onFetchError: (error: FetchError) => {
    console.warn(`The endpoint ${error.endpoint} failed`, error.error);
  },

  // Optional
  // Specify this option if you want to see some logging
  // Also used if onFetchError or onConfigurationUndefined are not specified
  log: console.info,
});

// This will return the cached configuration or load the configuration if nothing is in the cache
// If the interval option is specified; this will start polling after the initial load
// The callback will be invoked as well
const info = await configurationClient.getConfiguration();
console.log(info.error); // Only if all endpoints failed
console.log(info.status); // error | loaded | updated | cached
console.log(info.configuration); // Your configuration

// Same as getConfiguration() except it ignores the cache and forces a reload of the configuration
const { error, status, configuration } = await configurationClient.refresh();
console.log(info.error); // Only if all endpoints failed
console.log(info.status); // error | loaded | updated | equal
console.log(info.configuration); // Your configuration

// Pause/resume polling for new configuration
// Use these when the application goes offline to avoid unnecessary errors
configurationClient.pause(); // stops the interval
configurationClient.resume(); // starts the interval
```

## Why

I've written this module to primarily replace the `aws-exports.js` file that is generated and embedded by default into web and react-native apps by AWS Amplify. I publish some of the contents of that file remotely for the following benefits:

-   shared across repositories/apps/platforms more easily
-   allows me to point a beta build of ios/android at a production backend and revert the changes
-   allows me to update an app's configuration dynamically without new deployments
-   allows me to promote builds within Apple and Google without new deployments

I choose to roll my own solution instead of using Firebase or AWS because I could use this in any project without AWS/Google dependencies or additional cost; and because it's fun.

### My Design Requirements

-   Load configuration data at runtime from a public endpoint
-   Periodically check for configuration changes
-   Notify the application only when the configuration changes
-   No dependencies other than `fetch` and `lodash/isEqual`.
-   No assumptions of what the retrieved configuration looks like.
-   No assumptions of where the configuration lives or how to retrieve it.
-   Provide default implementations to cover my common use cases.
-   Should support running in the browser, node, react-native, and electron

### Further thoughts

#### Validation

This can be extended to include a validation method. If validation fails, could rollback to the previous valid configuration or find a valid endpoint. The logic required here is too advanced for my needs at the moment.

#### Configuration Management

I could write a management package in the future to make publishing configuration easier.

## License

[MIT](LICENSE)
