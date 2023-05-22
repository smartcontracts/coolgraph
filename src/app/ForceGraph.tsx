'use client'

import { useCallback, useEffect, useState } from 'react'
import { gql, useQuery, useLazyQuery } from '@apollo/client'
import SpriteText from 'three-spritetext'
import * as THREE from 'three'
import { ethers } from 'ethers'
import ForceGraph3D from 'react-force-graph-3d'
import { abi as EAS } from '@ethereum-attestation-service/eas-contracts/artifacts/contracts/EAS.sol/EAS.json'
import {GraphData} from "force-graph";

const rpc = 'https://goerli.optimism.io'
const provider = new ethers.providers.StaticJsonRpcProvider(rpc)
const eas = new ethers.Contract('0x1a5650d0ecbca349dd84bafa85790e3e6955eb84', EAS, provider)

export default function ForceGraph() {
  const schema = '0xab332d1e664f25fab6e9f383ccd036b8e32c299711d8dc071e866a69851f2e3a'
  const [tmpGraph, setTmpGraph] = useState<GraphData>({ nodes: [], links: [] })
  const [graph, setGraph] = useState<GraphData>({ nodes: [], links: [] })
  const { refetch,  } = useQuery(
    gql`
      query Query($where: AttestationWhereInput) {
        attestations(where: $where) {
          id
          schemaId
          attester
          recipient
          decodedDataJson
        }
      }
    `,
    {
      variables: {
        where: {
          schemaId: {
            equals: schema,
          },
          revoked: {
            equals: false,
          }
        }
      },
      onCompleted: async (data) => {
        const attestations = data.attestations
          .map((attestation: any) => {
            return {
              ...attestation,
              decodedDataJson: JSON.parse(attestation.decodedDataJson),
            }
          })
          .filter((attestation: any) => {
            return attestation.decodedDataJson[0].value.value = true
          })

        const addresses: Set<string> = attestations
          .reduce(
            (acc: Set<string>, attestation: any) => {
              acc.add(attestation.recipient)
              acc.add(attestation.attester)
              return acc
            }, new Set()
          )

        setTmpGraph({
          nodes: [
            ...Array.from(addresses).map((address: string) => {
              return {
                id: address,
                name: address,
                type: 'address'
              }
            }),
          ] as any,
          links: [
            ...attestations.map((attestation: any) => {
              return {
                source: attestation.attester,
                target: attestation.recipient,
                type: attestation.schemaId,
              }
            }),
          ] as any,
        })
      }
    },
  )



  const ENS_NAMES_QUERY = gql`
  query Attestations($where: EnsNameWhereInput) {
    ensNames(where: $where) {
      id
      name
    }
  }`;

  const [fetchEnsNames, { data: ensNamesData }] = useLazyQuery(ENS_NAMES_QUERY)

  useEffect(() => {
    if (tmpGraph.nodes.length > 0) {
      const addresses = tmpGraph.nodes.map((node: any) => node.id)
      fetchEnsNames({
        variables: {
          where: {
            id: {
              in: addresses,
              mode: 'insensitive',
            },
          },
        },
      })
    }
  }, [tmpGraph, fetchEnsNames])

  useEffect(() => {
    if (ensNamesData) {
      const ensNamesMap = new Map(
        ensNamesData.ensNames.map((ensName: any) => [ensName.id.toLowerCase(), ensName.name])
      )

      setGraph(() => {
        const updatedNodes = tmpGraph.nodes.map((node: any) => {
          const ensName = ensNamesMap.get(node.id.toLowerCase())
          return ensName ? { ...node, name: ensName } : node
        })

        return {
          nodes: updatedNodes,
          links: tmpGraph.links,
        }
      })
    }
  }, [ensNamesData])


  // Refetch on new attestations.
  useEffect(() => {
    // Add listener and remove it, idk what the rules are.
    const listener = () => { refetch() }
    eas.off('Attested', listener)
    eas.on('Attested', listener)
  }, [eas, refetch])

  // Load blockies.
  let blockies: any
  if (typeof document !== 'undefined') {
    blockies = require('ethereum-blockies')
  }

  // Generate one blockie to hack around a bug in the library.
  blockies?.create({ seed: 'fixies!' })

  // Open stuff on click.
  const handleClick = useCallback((node: any) => {
    if (node.type === 'address') {
      window.open(`https://etherscan.io/address/${node.id}`)
    }
  }, [])

  return (
    <main>
      <ForceGraph3D
        graphData={graph}
        nodeAutoColorBy="type"
        linkAutoColorBy="type"
        linkWidth={0.2}
        linkOpacity={0.5}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        linkDirectionalParticles={1}
        onNodeClick={handleClick}
        nodeThreeObject={(node: any) => {
          if (node.type === 'address') {
            const icon = blockies?.create({ seed: node.id })
            const data = icon?.toDataURL('image/png')
            const texture = new THREE.TextureLoader().load(data)
            texture.colorSpace = THREE.SRGBColorSpace
            const material = new THREE.SpriteMaterial({ map: texture })
            const sprite = new THREE.Sprite(material)
            sprite.scale.set(8, 8, 0)
            return sprite
          } else {
            const sprite = new SpriteText(node.name);
            sprite.color = node.color;
            sprite.textHeight = 4;
            return sprite;
          }
        }}
      />
    </main>
  )
}
