'use client'

import Graph from './graph'
import { ApolloProvider, ApolloClient, InMemoryCache } from '@apollo/client';

export default function Home() {
  const client = new ApolloClient({
    uri: 'https://optimism-goerli.easscan.org/graphql',
    cache: new InMemoryCache(),
  })

  return (
    <ApolloProvider client={client}>
      <main>
        <Graph></Graph>
      </main>
    </ApolloProvider>
  )
}
