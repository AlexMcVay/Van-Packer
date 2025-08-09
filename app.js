// js/app.js

document.addEventListener('DOMContentLoaded', () => {

    // --- Three.js Setup ---
    const vanContainer = document.getElementById('van-container');
    if (!vanContainer) {
        console.error("The 'van-container' element was not found.");
        return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, vanContainer.clientWidth / vanContainer.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialiasing: true });
    renderer.setSize(vanContainer.clientWidth, vanContainer.clientHeight);
    vanContainer.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;

    scene.background = new THREE.Color(0x282c34);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 1).normalize();
    scene.add(directionalLight);

    let vanMesh;

    // A function to create or update the van mesh
    function createVanMesh(width, height, depth) {
        // Remove the old van mesh if it exists
        if (vanMesh) {
            scene.remove(vanMesh);
            vanMesh.geometry.dispose();
            vanMesh.material.dispose();
        }
        
        const vanGeometry = new THREE.BoxGeometry(width, height, depth);
        const vanMaterial = new THREE.MeshStandardMaterial({
            color: 0x5a5a5a,
            transparent: true,
            opacity: 0.2,
            wireframe: true
        });
        vanMesh = new THREE.Mesh(vanGeometry, vanMaterial);
        scene.add(vanMesh);

        // Adjust camera position based on new van size
        camera.position.z = depth * 1.5;
        camera.position.y = height * 1;
        camera.lookAt(0, 0, 0);
    }

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    animate();

    // Handle window resizing
    window.addEventListener('resize', () => {
        camera.aspect = vanContainer.clientWidth / vanContainer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(vanContainer.clientWidth, vanContainer.clientHeight);
    });

    // --- Van Configuration ---
    const vanForm = document.getElementById('van-form');
    let vanDimensions = { width: 200, height: 200, depth: 400 };

    // Initial van creation with default values
    createVanMesh(vanDimensions.width, vanDimensions.height, vanDimensions.depth);

    vanForm.addEventListener('submit', (event) => {
        event.preventDefault();
        
        const width = parseFloat(document.getElementById('van-width').value);
        const height = parseFloat(document.getElementById('van-height').value);
        const depth = parseFloat(document.getElementById('van-depth').value);
        
        vanDimensions = { width, height, depth };
        createVanMesh(vanDimensions.width, vanDimensions.height, vanDimensions.depth);
    });

    // --- Item Management ---
    const itemsToPack = [];
    const itemForm = document.getElementById('item-form');
    const itemList = document.getElementById('item-list').querySelector('ul');
    const packButton = document.getElementById('pack-button');

    itemForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const name = document.getElementById('item-name').value;
        const quantity = parseInt(document.getElementById('item-quantity').value, 10);
        const width = parseFloat(document.getElementById('item-width').value);
        const height = parseFloat(document.getElementById('item-height').value);
        const depth = parseFloat(document.getElementById('item-depth').value);
        const weight = parseFloat(document.getElementById('item-weight').value);
        const isFragile = document.getElementById('item-fragile').checked;
        const isCushion = document.getElementById('item-cushion').checked;

        const newItem = {
            name,
            quantity,
            dimensions: { width, height, depth },
            weight,
            isFragile,
            isCushion
        };
        
        itemsToPack.push(newItem);
        
        const li = document.createElement('li');
        li.innerHTML = `<strong>${name}</strong> (${quantity}x)<br>
                        Dimensions: ${width}x${height}x${depth} cm<br>
                        Weight: ${weight} kg<br>
                        ${isFragile ? 'Fragile | ' : ''}
                        ${isCushion ? 'Cushion' : ''}`;
        itemList.appendChild(li);

        itemForm.reset();
    });

    packButton.addEventListener('click', () => {
        if (itemsToPack.length === 0) {
            alert('Please add some items to pack first!');
            return;
        }

        console.log('Starting packing process...');
        console.log('Van Dimensions:', vanDimensions);
        console.log('Items to pack:', itemsToPack);
        
        // Now our packing function can use the user-defined van dimensions
        // packVan(itemsToPack, vanDimensions);
    });

    function packVan(items, van) {
        // We'll implement this function in the next step
        console.log('Packing logic goes here...');
    }

});