# Territory Control: offline phone test build

This branch holds a test build only. It is not a release: `main` and the live game on Render are unchanged.

- **What it is (v20, "asphalt"):** the floor is real-looking asphalt made entirely in code (no grid, no image files), with land as raised colour on it; the arena is twice the area of v18. Cars are 20% quicker, every weapon clears twice the land, and land a weapon destroys stays scorched for 15 seconds (closing a loop round it no longer refills it). New abilities for all four classes, each easy to see when it fires (barrages land on rival land near you), holographic power zones, clean icon buttons and a camera further back. Portrait and landscape. Practice matches against bots; no online play.
- **Install on iPhone:** open the address in **Safari**, tap **Share**, then **Add to Home Screen**. Open it once while online; after that it starts and plays with no connection. (There is also a real iPhone app: branch `ios-app`.)
- **Install on Android:** open the address in Chrome, then menu, **Install app**.
- **Frame rate:** Settings (gear on the menu) then **Show frame rate**. Safari keeps web pages at 60 frames a second on iPhone; the iPhone app (branch `ios-app`) is set up for up to 120 on ProMotion screens.
- **Updating an installed copy:** open it once while online, close it, and open it again.

Built from `game/` on the `ios-app` branch (engine version 20). The rules differ from the live game: your own trail does not kill you, weapons only hurt cars that are off their own land, and the class kits are new:

- **Striker:** Ricochet Blades, Laser Wire; ultimate Blade Cyclone.
- **Titan:** Fault Line, Shockwave; ultimate Juggernaut.
- **Gunner:** Railgun, Cluster Mortar; ultimate Orbital Barrage.
- **Sapper:** Plasma Mines, Drone Swarm; ultimate Black Hole.
