Notes on camera permission behavior

- We reverted to the simpler flow: components call navigator.mediaDevices.getUserMedia directly.
- Browsers will automatically show the native permission dialog on the first getUserMedia call.
- If you want to re-introduce an in-app "Enable Camera" step, we had a helper at client/src/lib/cameraPermissions.ts that can be wired back.
- iOS Safari requires HTTPS (or localhost) and a user gesture (e.g., button click) to start camera.
- If camera shows as black screen on iOS, ensure playsInline is set and no autoplay restrictions block the stream.
