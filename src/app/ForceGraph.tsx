'use client'

import { useEffect, useRef, useState } from 'react'
import { gql, useQuery } from '@apollo/client';
import SpriteText from 'three-spritetext'
import * as THREE from 'three'
import { ethers } from 'ethers'
import ForceGraph3D, { ForceGraphMethods } from "react-force-graph-3d";

export default function ForceGraph() {
  const ATTESTER = '0xc0d4a22A93dA6a2b530650ae3A8094B7497c86F7'
  const SCHEMAS = {
    HACKATHON: '0xa2a91e9bf1ecbf377ae908a23e3a59f9f92bc659e0490d3ec87768a3a0549456',
    PROJECT: '0x8658c0b623ff50e62cd664b8a841edefdb296a54f6f188e2ee6f4e5d62874aa7',
    ATTENDEE: '0x18697034c35af85af5bd4e340a47e0b308e82c839b58d24745f4f286632bf1d5',
    TEAMIES: '0x1ef5ab6cd122b9b0301355f7c9e0e0afdddeab7909c7ebf16ca5f36fb372c5ea',
    PRIZES: '0xa3e8b65d54255a29f7ad193e536ebd099ec0b3cdefae13ee932648b0976459fe',
    PLACEMENTS: '0x67733d0412e6d7cb661f38e3869391e3074fa83e8df37d8268948d932a8212d5',
    ORGS: '0x6dfff69c36a728ee4fca6024f193cde3d6d8afa1b66e1b1685762ab2fef827bf',
    CONTRIBUTORS: '0xd00ca737466d87f08537ff23f5a6849fafed65a2f92ba6a45266b21707764644',
    WINNERS: '0x781d32e210584f0f5ba392dd163cb9fe145f2d6c74cac7c3edbdc4c0f475bcf6',
  }

  const [graph, setGraph] = useState({ nodes: [], links: [] })
  useQuery(
    gql`
      query Query($where: AttestationWhereInput) {
        attestations(where: $where) {
          id
          schemaId
          recipient
          decodedDataJson
        }
      }
    `,
    {
      pollInterval: 5000,
      variables: {
        where: {
          schemaId: {
            in: Object.values(SCHEMAS),
          },
          attester: {
            equals: ATTESTER,
          },
          revoked: {
            equals: false,
          }
        }
      },
      onCompleted: async (data) => {
        const matches = (id: string) => {
          return data.attestations
            .filter((attestation: any) => {
              return attestation.schemaId === id
            })
            .map((attestation: any) => {
              return {
                ...attestation,
                decodedDataJson: JSON.parse(attestation.decodedDataJson),
              }
            })
        }

        const hackathons = matches(SCHEMAS.HACKATHON)
        const projects = matches(SCHEMAS.PROJECT)
        const attendees = matches(SCHEMAS.ATTENDEE)
        const teamies = matches(SCHEMAS.TEAMIES)
        const prizes = matches(SCHEMAS.PRIZES)
        const placements = matches(SCHEMAS.PLACEMENTS)
        const orgs = matches(SCHEMAS.ORGS)
        const contributors = matches(SCHEMAS.CONTRIBUTORS)
        const winners = matches(SCHEMAS.WINNERS)

        setGraph({
          nodes: [
            ...hackathons.map((hackathon: any) => {
              return {
                id: hackathon.id,
                name: `${hackathon.decodedDataJson[0].value.value}\n(Hackathon)`,
                type: hackathon.schemaId,
              }
            }),
            ...attendees.map((attendee: any) => {
              return {
                id: attendee.recipient,
                name: attendee.recipient,
                type: attendee.schemaId,
              }
            }),
            ...projects.map((project: any) => {
              return {
                id: project.id,
                name: `${project.decodedDataJson[0].value.value}\n(Project)`,
                type: project.schemaId,
              }
            }),
            ...prizes.map((prize: any) => {
              return {
                id: prize.id,
                name: `${prize.decodedDataJson[0].value.value}\n(Prize)`,
                type: prize.schemaId,
              }
            }),
            ...placements.map((placement: any) => {
              return {
                id: placement.id,
                name: `${placement.decodedDataJson[0].value.value} x${ethers.BigNumber.from(placement.decodedDataJson[3].value.value).toNumber()}\n(Placement)`,
                type: placement.schemaId,
              }
            }),
            ...orgs.map((org: any) => {
              return {
                id: org.id,
                name: `${org.decodedDataJson[0].value.value}\n(Organization)`,
                type: org.schemaId,
              }
            }),
          ] as any,
          links: [
            ...attendees.map((attendee: any) => {
              return {
                source: attendee.recipient,
                target: attendee.decodedDataJson[1].value.value,
                type: attendee.schemaId,
              }
            }),
            ...projects.map((project: any) => {
              return {
                source: project.id,
                target: project.decodedDataJson[2].value.value,
                type: project.schemaId,
              }
            }),
            ...teamies.map((teamie: any) => {
              return {
                source: teamie.recipient,
                target: teamie.decodedDataJson[0].value.value,
                type: teamie.schemaId,
              }
            }),
            ...prizes.map((prize: any) => {
              return {
                source: prize.id,
                target: prize.decodedDataJson[2].value.value,
                type: prize.schemaId,
              }
            }),
            ...placements.map((placement: any) => {
              return {
                source: placement.id,
                target: placement.decodedDataJson[4].value.value,
                type: placement.schemaId,
              }
            }),
            ...contributors.map((contributor: any) => {
              return {
                source: contributor.recipient,
                target: contributor.decodedDataJson[0].value.value,
                type: contributor.schemaId,
              }
            }),
            ...winners.map((winner: any) => {
              return {
                source: winner.decodedDataJson[0].value.value,
                target: winner.decodedDataJson[1].value.value,
                type: winner.schemaId,
              }
            }),
          ] as any,
        })
      }
    },
  )

  let blockies: any
  if (typeof document !== 'undefined') {
    blockies = require('ethereum-blockies')
  }

  // Generate one blockie to hack around a bug in the library.
  blockies?.create({ seed: 'fixies!' })

  const fgRef = useRef<ForceGraphMethods>()
  const distance = 500
  useEffect(() => {
    if (!fgRef.current) return
    fgRef.current.cameraPosition({ z: distance });

    // camera orbit
    let angle = 0;
    setInterval(() => {
      if (!fgRef.current) return
      fgRef.current.cameraPosition({
        x: distance * Math.sin(angle),
        z: distance * Math.cos(angle)
      });
      angle += Math.PI / 900;
    }, 10);
  }, []);

  return (
    <main>
      <ForceGraph3D
        ref={fgRef}
        graphData={graph}
        nodeAutoColorBy="type"
        linkAutoColorBy="type"
        linkWidth={0.2}
        linkOpacity={0.5}
        nodeThreeObject={(node: any) => {
          if (node.type === SCHEMAS.ATTENDEE) {
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
