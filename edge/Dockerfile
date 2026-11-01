FROM node:22-alpine
WORKDIR /agent
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
RUN npm install tsx@4.19.2
COPY tsconfig.json ./
COPY src ./src
# Buffered samples live in a volume so they survive container restarts.
VOLUME ["/agent/data"]
ENV BUFFER_FILE=/agent/data/buffer.jsonl
CMD ["npx", "tsx", "src/agent.ts"]
