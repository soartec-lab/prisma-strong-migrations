# prisma-strong-migrations Development Container
FROM node:25-bookworm-slim

# Install basic development tools
RUN apt-get update && apt-get install -y \
    curl \
    git \
    vim \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install git-secrets (requires root to write to /usr/local/bin)
RUN git clone https://github.com/awslabs/git-secrets.git /tmp/git-secrets \
    && cp /tmp/git-secrets/git-secrets /usr/local/bin/git-secrets \
    && chmod +x /usr/local/bin/git-secrets \
    && rm -rf /tmp/git-secrets

# Set working directory
WORKDIR /workspace

# Switch to node user before installing user-scoped tools
# (vp installs to $HOME/.vite-plus, so must run as the target user)
USER node

# Install Vite+ as node user so it lands in /home/node/.vite-plus
RUN curl -fsSL https://vite.plus | bash

# Set environment variables
ENV PATH="/home/node/.vite-plus/bin:/home/node/.local/bin:$PATH"
