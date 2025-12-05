## How to run graph-node indexer query

### Initialize Custom Indexer
graph init fenelabs-indexer /home/joy/graph-query \
--protocol ethereum \
--abi /home/joy/graph-query/abi/Validators.json \
--contract-name Validators \
--from-contract 0x0000000000000000000000000000000000001000 \
--start-block 0 \
--network fenechain

### Deploy Docker
podman-compose up -d 

### Deploy Graph Local
graph codegen
graph create --node http://localhost:8020 fenelabs-indexer
graph deploy --node http://localhost:8020 --ipfs http://localhost:5001 fenelabs-indexer

