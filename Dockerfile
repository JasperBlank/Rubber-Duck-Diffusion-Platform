FROM python:3.12-slim

WORKDIR /app

COPY . .

ENV PYTHONUNBUFFERED=1
ENV PORT=8000

CMD ["python", "app.py"]
