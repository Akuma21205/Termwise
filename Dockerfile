# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Python Backend Runtime
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code & static frontend assets
COPY core/ ./core/
COPY agents/ ./agents/
COPY razorpay/ ./razorpay/
COPY api/ ./api/
COPY simulator/ ./simulator/
COPY main.py ./
COPY pyproject.toml ./
COPY --from=frontend-builder /app/web/dist ./web/dist

EXPOSE 8080

CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
