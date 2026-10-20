FROM python:3.11.9-slim

WORKDIR /app

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Chromium plus the system libraries it needs. Letting Playwright
# resolve the packages keeps this working across Debian releases - the old
# hand-written apt list broke when the base image moved to trixie and
# libasound2 was renamed libasound2t64.
RUN playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Production server. Flask's built-in server (python main.py) is single
# threaded and not meant for production; the long timeout covers Groq
# analysis and headless-Chromium PDF rendering.
CMD ["gunicorn", "main:app", \
     "--bind", "0.0.0.0:5000", \
     "--workers", "1", \
     "--threads", "4", \
     "--timeout", "180", \
     "--graceful-timeout", "30", \
     "--access-logfile", "-"]
