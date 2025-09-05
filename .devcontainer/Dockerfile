FROM mcr.microsoft.com/devcontainers/javascript-node:1-20-bullseye

# Install additional tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    curl \
    wget \
    jq \
    netcat \
    telnet \
    dnsutils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install global npm packages
RUN npm install -g \
    nodemon \
    pm2 \
    concurrently \
    json-server \
    ngrok

# Create workspace directory
WORKDIR /workspace

# Set up environment
ENV NODE_ENV=development
ENV MONITOR_PORT=3001
ENV WEBHOOK_PORT=3002

# Expose ports
EXPOSE 3001 3002

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Create directories for reports and processed configs
RUN mkdir -p reports config/processed

# Set permissions
RUN chown -R node:node /workspace

USER node

CMD ["npm", "run", "monitor"]