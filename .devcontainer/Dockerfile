# prisma-strong-migrations Development Container
FROM node:25-bookworm-slim

# Install basic development tools
RUN apt-get update && apt-get install -y \
    curl \
    git \
    vim \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install git-secrets
RUN git clone https://github.com/awslabs/git-secrets.git /tmp/git-secrets \
    && cp /tmp/git-secrets/git-secrets /usr/local/bin/git-secrets \
    && chmod +x /usr/local/bin/git-secrets \
    && rm -rf /tmp/git-secrets

# Install Vite+ globally
RUN curl -fsSL https://vite.plus | bash

# Set working directory
WORKDIR /workspace

# Switch to node user for better security
USER node

# Set environment variables
ENV PATH="/home/node/.local/bin:$PATH"
