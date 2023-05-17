'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { gql, useQuery } from '@apollo/client'
import SpriteText from 'three-spritetext'
import * as THREE from 'three'
import { ethers } from 'ethers'
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d'
import { abi as EAS } from '@ethereum-attestation-service/eas-contracts/artifacts/contracts/EAS.sol/EAS.json'

export default function ForceGraph() {
  const rpc = 'https://goerli.optimism.io'
  const provider = new ethers.providers.StaticJsonRpcProvider(rpc)
  const eas = new ethers.Contract('0x1a5650d0ecbca349dd84bafa85790e3e6955eb84', EAS, provider)

  const schema = '0xab332d1e664f25fab6e9f383ccd036b8e32c299711d8dc071e866a69851f2e3a'
  const [graph, setGraph] = useState({ nodes: [], links: [] })
  const { refetch } = useQuery(
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

        setGraph({
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
