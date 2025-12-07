## How to run graph-node indexer query

### Initialize Custom Indexer
```bash
graph init fenelabs-indexer /home/joy/graph-query \
--protocol ethereum \
--abi /home/joy/graph-query/abi/Validators.json \
--contract-name Validators \
--from-contract 0x0000000000000000000000000000000000001000 \
--start-block 0 \
--network fenechain
```

### Deploy Docker

```bash
podman-compose up -d 
```

### Deploy Graph Local

```bash
npm run fresh-deploy
```
