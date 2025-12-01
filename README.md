## WebRTC LAN Streaming

Endpoint ini menyiarkan video dari kamera perangkat sebagai WebRTC stream yang bisa diakses perangkat lain dalam 1 jaringan (tanpa audio). Versi ini otomatis mengambil hingga 4 kamera (jika tersedia) dan menayangkannya serentak, tanpa perlu memilih Room ID.

### Menjalankan

```bash
npm install
npm start
```

Server berjalan di port `3000`. Untuk perangkat lain, pakai IP LAN perangkat ini (bukan `localhost`), contoh: `http://192.168.1.10:3000`.

### Menjalankan dengan Docker

```bash
docker build -t webrtc-lan .
docker run --rm -p 3000:3000 webrtc-lan
```

Kemudian akses `http://<IP-perangkat-ini>:3000/sender.html`.

### Alur penggunaan

1. Di perangkat pengirim (yang punya kamera):
   - Buka `http://<IP-perangkat-ini>:3000/sender.html`.
   - Aplikasi otomatis mencoba membuka hingga 4 kamera dan mulai siaran. Izinkan akses kamera jika diminta.
2. Di perangkat penerima:
   - Buka `http://<IP-perangkat-ini>:3000/viewer.html`.
   - Aplikasi otomatis terhubung dan menampilkan hingga 4 video dalam grid 2x2.

Koneksi memakai STUN publik (`stun:stun.l.google.com:19302`) dan WebSocket lokal sebagai signaling.
# WrebRTC_Stream_Camera
