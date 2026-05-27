# SETUP-PI.md — one-time setup for CI/CD to a Raspberry Pi

This is the one-time path from a fresh Pi to "push to `master` and the app
auto-deploys." Pair with [.github/workflows/deploy-pi.yml](.github/workflows/deploy-pi.yml).

Assumptions:
- A Raspberry Pi 4 or 5 (anything with ≥ 1 GB RAM that can run Node 22).
- Pi reachable on your LAN (e.g., `pi.local` or its IP).
- A Linux user account on the Pi (referred to as `jesse` below — adjust as needed).
- You can `ssh` to the Pi and have `sudo`.

---

## 1. Install Node 22 on the Pi

Use NodeSource (works on Raspberry Pi OS / Debian / Ubuntu):

```sh
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version    # should print v22.x.x
```

Or use [`fnm`](https://github.com/Schniz/fnm) if you'd rather not touch the
system package manager.

---

## 2. Create the deploy directory

```sh
sudo mkdir -p /srv/work_search_log
sudo chown jesse:jesse /srv/work_search_log
```

The deploy workflow rsyncs into here. `data/` lives inside this dir and is
excluded from the rsync so the SQLite DB persists across deploys.

---

## 3. Install the systemd service

```sh
# From a checkout of this repo on the Pi:
sudo cp deploy/work-search-log.service /etc/systemd/system/
sudo systemctl daemon-reload

# Don't start it yet — there's no code in /srv/work_search_log until the
# first deploy. Enable it so it auto-starts on boot.
sudo systemctl enable work-search-log
```

If your username is not `jesse`, edit `User=` and `Group=` in the unit
file before copying.

---

## 4. Install the sudoers rule

So the GitHub Actions runner can restart the service without a password:

```sh
sudo cp deploy/work-search-log.sudoers /etc/sudoers.d/work-search-log
sudo chmod 0440 /etc/sudoers.d/work-search-log
sudo visudo -c    # validate
```

This only grants `systemctl restart/status/reload work-search-log` — nothing
else.

---

## 5. Install the GitHub Actions runner

1. On GitHub: **Settings → Actions → Runners → New self-hosted runner**.
2. Pick **Linux** + the right architecture (`ARM64` for Pi 4/5 running 64-bit OS).
3. Follow the on-screen commands. They will look like:

```sh
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-arm64-2.x.tar.gz -L https://github.com/actions/runner/releases/download/v2.x/actions-runner-linux-arm64-2.x.tar.gz
tar xzf ./actions-runner-linux-arm64-2.x.tar.gz
./config.sh --url https://github.com/jeswcollins/work_search_log --token <one-time-token>
```

When asked for labels, accept the default — the workflow uses `runs-on: self-hosted`
which matches any self-hosted runner.

4. Install as a systemd service so it stays running:

```sh
sudo ./svc.sh install jesse    # or whatever user
sudo ./svc.sh start
sudo ./svc.sh status
```

---

## 6. First deploy

Merge `phase-1-react` into `master` (or `git checkout master && git merge phase-1-react && git push`).

The workflow fires on push to `master`. Watch it in the **Actions** tab of
the GitHub repo. On success the Pi will have:

- Files under `/srv/work_search_log/`
- DB created automatically on first request at `/srv/work_search_log/data/work_search.db`
- Service running on `:1025`

Visit `http://pi.local:1025/` (or the Pi's IP) on your LAN.

---

## 7. (Optional) Manual deploys

In the **Actions** tab → "Deploy to Pi" → **Run workflow** lets you pick a
branch or commit. Useful for one-off deploys of `phase-1-react` while
master is still on the legacy code.

---

## 8. Migrating the legacy 2018–2019 data

One-time, after the first deploy:

```sh
cd /srv/work_search_log
# Copy your OneDrive legacy folder onto the Pi first (scp from your laptop).
node migrate.js /home/jesse/legacy_logs/work_search_logs_by_day
```

The migration script flags imported rows with `legacy=1` so they're visually
distinct in the Job List.

---

## Troubleshooting

- **`npm ci` is slow on the Pi.** Normal — it's the heaviest part of the
  build (~30–60s on a Pi 4, ~15s on a Pi 5). The cache lives in
  `~/.npm` so subsequent runs are faster.
- **`vite build` runs out of memory.** Add 1–2 GB of swap, or use a Pi 4
  with ≥ 4 GB RAM. Vite needs ~512 MB during build.
- **Service won't start.** `sudo journalctl -u work-search-log -e` shows the
  last log lines. Most common cause: wrong `User=` in the unit file.
- **Workflow fires but nothing happens.** The workflow only triggers on
  push to `master`; it does *not* trigger on `phase-1-react`. Use the
  manual "Run workflow" button if you want to deploy from another branch.
- **Need to roll back.** `cd /srv/work_search_log && git log` doesn't work
  here — the deploy is an rsync, not a checkout. Roll back by reverting the
  offending commit on `master` and pushing; the workflow re-runs.
