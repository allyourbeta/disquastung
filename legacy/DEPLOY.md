# KnightMoves — Deploy & Test

## Local Testing

```bash
cd ~/Dropbox/programming/knightmoves_flask_app
source knight-venv/bin/activate
flask run --host=0.0.0.0 --port=8080
```

- Laptop browser: `http://localhost:8080`
- Phone (same Wi-Fi): `http://<your-mac-ip>:8080` (find IP via System Settings → Wi-Fi → Details → IP Address)

## Deploy to Production (PythonAnywhere)

PythonAnywhere username: **kronsteen**
Live URL: **https://kronsteen.pythonanywhere.com**

### 1. Commit and push from your Mac

```bash
cd ~/Dropbox/programming/knightmoves_flask_app
git add -A
git commit -m "describe your changes"
git push origin main
```

### 2. Pull on PythonAnywhere

Open a Bash console from the PythonAnywhere dashboard (Consoles tab), or SSH in:

```bash
cd /home/kronsteen/flask-knight-moves/flask-knight-moves
git pull origin main
```

### 3. Reload the web app

Go to the **Web** tab on PythonAnywhere → click the green **Reload** button.

This is required because PythonAnywhere keeps the Flask process in memory. Without a reload, the old code keeps running even though the files on disk are updated.

## Troubleshooting

- **Changes not showing on production?** You probably forgot to click Reload (step 3).
- **Phone can't reach local server?** Make sure both devices are on the same Wi-Fi and you're using `--host=0.0.0.0` (not the default `127.0.0.1`).
- **Static files (CSS/JS) cached in browser?** Hard-refresh on desktop (Cmd+Shift+R) or clear Safari cache on iPhone.
