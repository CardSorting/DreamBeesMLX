# 🎨 Creative End-User Guide (Non-Technical User Guide)

Welcome to **DreamBees MLX Studio**! This guide is designed for artists, designers, and non-technical creative users who want to create stunning AI artwork on their Mac without writing code or dealing with complex setup commands.

---

## 🌟 1-Minute Quick Start

### 1. Launch the Desktop App
Open **DreamBees Lite** from your macOS `/Applications` folder.

### 2. Touchless Onboarding Wizard
On your first launch, the app automatically presents a 4-stage onboarding wizard:
- ⚡ **Metal GPU Check**: Confirms your Mac's M1/M2/M3/M4 chip is ready.
- 🐍 **Automatic MLX Setup**: Automatically installs the AI rendering engine silently in the background.
- 🧠 **Model Verification**: Pre-checks image creation model weights.
- ✨ **Ready!**: Zero clicks needed!

### 3. Choose a Hardware Preset
Select the preset that best fits your workflow:
- 🚀 **Fast Speed Preset**: Optimized for sub-second generation on all M-Series Macs (8GB+ RAM).
- 🎨 **Ultra Quality Preset**: Maximum photorealism optimized for 16GB+ RAM Macs.

### 4. Click a 1-Click Starter Template
Click any of the starter cards (*Cyberpunk Golden Bee*, *Watercolor Sunset*, *Renaissance Clockwork Bee*) to render your very first AI image locally in seconds!

---

## 🎨 Studio Canvas Navigation

1. **Prompt Box**: Type any description of the artwork you want to create (e.g. *"Golden retriever wearing a astronaut helmet on Mars"*).
2. **Aspect Ratio Selector**: Choose image dimensions:
   - `1:1` (Square)
   - `16:9` (Widescreen Landscape)
   - `9:16` (Mobile / Story Portrait)
3. **Step History Rail**: View thumbnail preview snapshots of your image being created step-by-step in real time!
4. **Local Gallery**: All generated images are saved automatically on your Mac. Click **Local Gallery** in the sidebar to browse, inspect EXIF prompt data, or open files in Finder.

---

## ❓ Frequently Asked Questions (FAQ)

### Do I need an internet connection?
No! Once the model weights are downloaded, DreamBees MLX operates **100% offline**. You can create artwork on an airplane or without Wi-Fi.

### Will this slow down my Mac?
No! DreamBees caps memory usage and runs rendering with low process priority (`nice -n 10`) so your mouse, desktop, and other apps remain 100% smooth and responsive during rendering.

### Where are my images saved?
All images are saved locally at `~/Library/Application Support/DreamBees Lite/generations/`. Click **Open in Finder** inside the Gallery view to view your PNG files directly.
