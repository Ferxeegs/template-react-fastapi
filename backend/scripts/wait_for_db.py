"""Wait until the configured database accepts connections."""
import os
import subprocess
import sys
import time


def _wait_mysql(max_attempts: int) -> None:
    import pymysql

    host = os.environ["DB_HOST"]
    port = int(os.environ.get("DB_PORT", "3306"))
    user = os.environ["DB_USER"]
    password = os.environ.get("DB_PASSWORD", "")
    database = os.environ.get("DB_NAME", "")

    for attempt in range(1, max_attempts + 1):
        try:
            conn = pymysql.connect(
                host=host,
                port=port,
                user=user,
                password=password,
                database=database or None,
                charset="utf8mb4",
            )
            conn.close()
            print(f"MySQL ready at {host}:{port}/{database or '(no db)'}")
            return
        except Exception as exc:
            print(f"Waiting for MySQL ({attempt}/{max_attempts}): {exc}", flush=True)
            time.sleep(2)

    raise TimeoutError(f"MySQL not ready after {max_attempts} attempts")


def _wait_postgresql(url: str, max_attempts: int) -> None:
    for attempt in range(1, max_attempts + 1):
        result = subprocess.run(
            ["pg_isready", "-d", url],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if result.returncode == 0:
            print("PostgreSQL ready")
            return
        print(f"Waiting for PostgreSQL ({attempt}/{max_attempts})...", flush=True)
        time.sleep(1)

    raise TimeoutError(f"PostgreSQL not ready after {max_attempts} attempts")


def main() -> None:
    url = os.environ.get("DATABASE_URL", "")
    max_attempts = int(os.environ.get("DB_WAIT_MAX_ATTEMPTS", "60"))

    if url.startswith("mysql") or os.environ.get("DB_DRIVER", "").lower() == "mysql":
        _wait_mysql(max_attempts)
        return

    if url.startswith("postgresql"):
        _wait_postgresql(url, max_attempts)
        return

    if os.environ.get("DB_HOST"):
        _wait_mysql(max_attempts)
        return

    print("Cannot determine database type for readiness check", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except TimeoutError as exc:
        print(exc, file=sys.stderr)
        sys.exit(1)
