FROM node:20-alpine

WORKDIR /app

# Install deps first (cache layer)
COPY package*.json ./
RUN npm ci --production

# Copy source
COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
