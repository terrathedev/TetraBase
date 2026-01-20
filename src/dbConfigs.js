export const databaseMap = {
    'PostgreSQL': { image: 'postgres:alpine', defaultPort: 5432, env: (pw) => [`POSTGRES_PASSWORD=${pw}`] },
    'Redis': { image: 'redis:alpine', defaultPort: 6379, env: () => [] },
    'MongoDB': { image: 'mongo:latest', defaultPort: 27017, env: () => [] },
    'Neo4j': { image: 'neo4j:latest', defaultPort: 7474, env: () => [] }
};
