# Install PM2
npm install -g pm2

# Build your app
npm run build

# Start with PM2
pm2 start "pnpm run web:prod" --name "web"
pm2 start "pnpm run worker:prod" --name "worker"

# Save and setup auto-start
pm2 save
pm2 startup
