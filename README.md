# D-He3 Fusion Lab

An interactive, browser-based comparison of fusion fuels (D-T, D-³He, D-D) built on published reaction data and a simple plasma power-balance model.

- **Fuels**: the nuclei involved (D, T, ³He, ⁴He).
- **Reactions**: Bosch-Hale reactivity ⟨σv⟩(T), ignition triple product nTτ, and reaction energies/neutron shares.
- **Reactor**: a 0-D time-dependent simulation (fusion heating vs bremsstrahlung vs transport loss, plus external heating) that tracks D, T, ³He, ⁴He and proton densities, so fuel burns up and fusion ash builds up. Fuel feed and ash removal times are adjustable (slider maximum = off).

**Live demo:** https://jeorgexyz.github.io/dhe3/

## Run

```
npm install
npm run dev      # development server
npm test         # physics tests
npm run build    # typecheck + production build
```

## Model and its limits

- Reactivities: Bosch & Hale, *Nucl. Fusion* 32 (1992) 611, valid up to ~100 keV (the sim is capped there).
- Bremsstrahlung: NRL Plasma Formulary. Ions and electrons share one temperature.
- Included: burn-up, ash dilution, and secondary burn of D-D products (T, ³He) in every plasma.
- Ignores: spatial profiles, impurities, synchrotron radiation, non-thermal (slowing-down) ions, energy carried by injected/pumped particles, and finite charged-particle confinement. The ignition-curve plot assumes a fresh fuel load with no ash.
- Educational, not a reactor design tool. Qualitative results (D-³He needs ~10x the nTτ of D-T and is not truly neutron-free because of D-D side reactions) are the point.

## Layout

- `src/physics/` typed physics core with tests
- `src/components/` the three views

## License

MIT, Copyright (c) 2024-2026 Jeorge D. Anderson II. See [LICENSE](LICENSE).
