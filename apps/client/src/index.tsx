import { Authenticator } from '@aws-amplify/ui-react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Amplify } from 'aws-amplify';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { IntlProvider } from 'react-intl';
import { RouterProvider } from 'react-router-dom';

import { DEFAULT_LOCALE } from './constants';
import { router } from './router';
import { queryClient } from './data/query-client';
import { setServiceUrl } from './services';
import type { GlobalWithResources } from './types/global-with-resources';

import '@aws-amplify/ui-react/styles.css';
import '@cloudscape-design/global-styles/index.css';

const globalWithResources = global as GlobalWithResources;

const awsResources = globalWithResources.awsResources.amplifyConfiguration;
Amplify.configure(awsResources);

setServiceUrl(globalWithResources.awsResources.coreServer.endpoint);

const rootEl = document.getElementById('root');

if (rootEl != null) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <Authenticator>
        <IntlProvider locale="en" defaultLocale={DEFAULT_LOCALE}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </IntlProvider>
      </Authenticator>
    </React.StrictMode>,
  );
}