module.exports = {
  apps: [
    {
      name: 'green-corridor',
      script: 'backend/src/server.js',
      // Allow Node.js to use up to 1.5GB RAM for parsing the 84MB OSM Road Graph
      node_args: '--max-old-space-size=1536',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
