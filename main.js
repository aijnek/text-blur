document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const uploadButton = document.getElementById('uploadButton');
    const loading = document.getElementById('loading');
    const canvas = document.getElementById('outputCanvas');
    const ctx = canvas.getContext('2d');

    // Advanced blur function with edge softening
    function applyNaturalBlur(imageData) {
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const tempPixels = new Uint8ClampedArray(pixels.length);
        
        // First pass: Large radius box blur
        const radius = 20;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                let count = 0;
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const px = Math.min(Math.max(x + dx, 0), width - 1);
                        const py = Math.min(Math.max(y + dy, 0), height - 1);
                        const i = (py * width + px) * 4;
                        
                        r += pixels[i];
                        g += pixels[i + 1];
                        b += pixels[i + 2];
                        a += pixels[i + 3];
                        count++;
                    }
                }
                
                const i = (y * width + x) * 4;
                tempPixels[i] = r / count;
                tempPixels[i + 1] = g / count;
                tempPixels[i + 2] = b / count;
                tempPixels[i + 3] = a / count;
            }
        }
        
        // Second pass: Gaussian-like smoothing
        const sigma = 30;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                let weightSum = 0;
                
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const px = Math.min(Math.max(x + dx, 0), width - 1);
                        const py = Math.min(Math.max(y + dy, 0), height - 1);
                        const i = (py * width + px) * 4;
                        const distance = dx * dx + dy * dy;
                        const weight = Math.exp(-distance / (2 * sigma * sigma));
                        
                        r += tempPixels[i] * weight;
                        g += tempPixels[i + 1] * weight;
                        b += tempPixels[i + 2] * weight;
                        a += tempPixels[i + 3] * weight;
                        weightSum += weight;
                    }
                }
                
                const i = (y * width + x) * 4;
                pixels[i] = r / weightSum;
                pixels[i + 1] = g / weightSum;
                pixels[i + 2] = b / weightSum;
                pixels[i + 3] = a / weightSum;
            }
        }
        
        return imageData;
    }

    // Process image with text detection and blur
    async function processImage(file) {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        
        await new Promise(resolve => img.onload = resolve);
        
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);

        try {
            loading.style.display = 'block';
            
            // Perform OCR
            const result = await Tesseract.recognize(img, 'jpn+eng', {
                logger: m => console.log(m)
            });

            // Process each detected word
            for (const word of result.data.words) {
                const bbox = word.bbox;
                
                // Add moderate padding with feathered edges
                const padding = 15;
                const x = Math.max(0, Math.floor(bbox.x0 - padding));
                const y = Math.max(0, Math.floor(bbox.y0 - padding));
                const width = Math.min(canvas.width - x, Math.ceil(bbox.x1 - bbox.x0 + padding * 2));
                const height = Math.min(canvas.height - y, Math.ceil(bbox.y1 - bbox.y0 + padding * 2));

                // Get the region containing text
                const regionData = ctx.getImageData(x, y, width, height);

                // Apply natural-looking blur
                applyNaturalBlur(regionData);

                // Put the blurred region back
                ctx.putImageData(regionData, x, y);
            }

            loading.style.display = 'none';
        } catch (error) {
            console.error('Error processing image:', error);
            loading.style.display = 'none';
            alert('画像の処理中にエラーが発生しました。');
        }
    }

    // Handle file input change
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            
            img.onload = () => {
                // Set canvas size to match image
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Draw original image
                ctx.drawImage(img, 0, 0);
            };
        }
    });

    // Handle upload button click for blur processing
    uploadButton.addEventListener('click', () => {
        const file = imageInput.files[0];
        if (file) {
            processImage(file);
        } else {
            alert('画像を選択してください。');
        }
    });
});
