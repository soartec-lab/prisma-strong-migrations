# prisma-strong-migrations Development Container
FROM node:25-bookworm-slim

# Install basic development tools
RUN apt-get update && apt-get install -y \
    curl \
    git \
    vim \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Vite+ globally
RUN curl -fsSL https://vite.plus | bash

# Set working directory
WORKDIR /workspace

# Switch to node user for better security
USER node

# Set environment variables
ENV PATH="/home/node/.local/bin:$PATH"
