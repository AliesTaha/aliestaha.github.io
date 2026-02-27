import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.getElementById('statue-container');
if (container) {
    init();
}

function init() {
    const scene = new THREE.Scene();

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(renderer.domElement);

    // Warm lighting to match beige palette
    scene.add(new THREE.AmbientLight(0xf5e6d0, 0.6));

    const keyLight = new THREE.DirectionalLight(0xfff0e0, 1.4);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe8ddd0, 0.5);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    let model = null;
    let baseY = 0;
    const loader = new GLTFLoader();

    loader.load(
        'atlas.glb',
        function (gltf) {
            model = gltf.scene;

            // Compute bounding box
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            // Scale model to fit in a ~2.5 unit box
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2.5 / maxDim;
            model.scale.setScalar(scale);

            // Re-center after scaling
            const scaledBox = new THREE.Box3().setFromObject(model);
            const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
            const scaledSize = scaledBox.getSize(new THREE.Vector3());

            // Move model so its center is at origin
            model.position.sub(scaledCenter);
            baseY = model.position.y;

            // Auto-fit camera: pull back far enough to see the full model
            const fov = camera.fov * (Math.PI / 180);
            const maxExtent = Math.max(scaledSize.x, scaledSize.y);
            const fitDist = (maxExtent / 2) / Math.tan(fov / 2);
            camera.position.set(0, 0, fitDist * 1.2);
            camera.lookAt(0, 0, 0);

            model.traverse(function (child) {
                if (child.isMesh && child.material) {
                    child.material.envMapIntensity = 0.3;
                }
            });

            scene.add(model);
            container.style.opacity = '1';
        },
        undefined,
        function (err) {
            console.warn('3D model failed to load:', err);
            container.style.display = 'none';
            // Show fallback
            const fb = document.getElementById('statue-fallback');
            if (fb) fb.style.display = '';
        }
    );

    // Mouse tracking for subtle interaction
    let targetRotY = 0;
    let targetRotX = 0;
    let currentRotY = 0;
    let currentRotX = 0;

    document.addEventListener('mousemove', function (e) {
        targetRotY = ((e.clientX / window.innerWidth) * 2 - 1) * 0.3;
        targetRotX = ((e.clientY / window.innerHeight) * 2 - 1) * 0.1;
    });

    let baseRotation = 0;
    let breathePhase = 0;

    function animate() {
        requestAnimationFrame(animate);

        if (model) {
            baseRotation += 0.002;

            currentRotY += (targetRotY - currentRotY) * 0.03;
            currentRotX += (targetRotX - currentRotX) * 0.03;

            model.rotation.y = baseRotation + currentRotY;
            model.rotation.x = currentRotX;

            breathePhase += 0.015;
            model.position.y = baseY + Math.sin(breathePhase) * 0.02;
        }

        renderer.render(scene, camera);
    }

    animate();
}
