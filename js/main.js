gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {
  // Home page 3D
  const canvas = document.getElementById('home3d');
  if (canvas) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    scene.add(new THREE.AmbientLight(0x330022));
    const light = new THREE.DirectionalLight(0xff3366, 0.8);
    light.position.set(5,5,5);
    scene.add(light);
    const geometry = new THREE.IcosahedronGeometry(1.2, 0);
    const material = new THREE.MeshStandardMaterial({ color: 0xff3366, roughness: 0.2, metalness: 0.9, emissive: 0x220011, emissiveIntensity: 0.5 });
    const shapes = [];
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set((Math.random()-0.5)*10, (Math.random()-0.5)*6, (Math.random()-0.5)*8 - 4);
      scene.add(mesh);
      shapes.push(mesh);
    }
    camera.position.z = 8;
    function animate() {
      requestAnimationFrame(animate);
      shapes.forEach((s, i) => {
        s.rotation.x += 0.004 + i*0.001;
        s.rotation.y += 0.006;
        s.position.y += Math.sin(Date.now()*0.001 + i)*0.003;
      });
      renderer.render(scene, camera);
    }
    animate();
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // Hero text
  const heroTitle = document.querySelector('.hero h1');
  if (heroTitle) {
    gsap.from(heroTitle, { y: 100, opacity: 0, duration: 1.2, ease: 'power4.out' });
    gsap.from('.hero p', { y: 50, opacity: 0, duration: 1, delay: 0.3, ease: 'power3.out' });
    gsap.from('.hero .btn', { y: 30, opacity: 0, duration: 0.8, delay: 0.6 });
  }

  // Features
  gsap.utils.toArray('.feature-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' },
      y: 60, opacity: 0, duration: 0.7, delay: i * 0.15, ease: 'power2.out'
    });
  });

  // Steps
  gsap.utils.toArray('.step').forEach((step, i) => {
    gsap.from(step, {
      scrollTrigger: { trigger: step, start: 'top 85%' },
      x: i % 2 === 0 ? -50 : 50, opacity: 0, duration: 0.8, delay: i * 0.2
    });
  });

  // Flip card
  const flipCard = document.querySelector('.flip-card');
  if (flipCard) {
    flipCard.addEventListener('click', () => flipCard.classList.toggle('flipped'));
    gsap.from('.flip-card', { scale: 0.8, opacity: 0, duration: 1, ease: 'elastic.out(1,0.7)' });
  }

  // Team members
  gsap.utils.toArray('.team-member').forEach((member, i) => {
    gsap.from(member, {
      scrollTrigger: { trigger: member, start: 'top 85%' },
      scale: 0.8, opacity: 0, duration: 0.7, delay: i * 0.2, ease: 'back.out(1.5)'
    });
  });

  // Forms
  const form = document.querySelector('.form-box');
  if (form) {
    gsap.from(form, { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out' });
  }
});