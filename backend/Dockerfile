FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libpam0g \
    libpam-modules \
    libpam-runtime \
    libpam0g-dev \
    passwd \
    procps \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 5000

CMD ["npm", "run", "start"]