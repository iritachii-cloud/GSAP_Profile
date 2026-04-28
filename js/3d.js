class KittyModel {
  constructor() { this.group = new THREE.Group(); this.build(); }
  build() {
    const headGeo = new THREE.SphereGeometry(1.3,48,48);
    const headMat = new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.3, metalness:0.05 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.scale.set(1,0.85,0.95); this.group.add(head);

    const earGeo = new THREE.ConeGeometry(0.45,0.75,16);
    const earMat = new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.3 });
    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-0.85,1.0,0); leftEar.rotation.z=0.4; leftEar.rotation.x=0.1; this.group.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, earMat);
    rightEar.position.set(0.85,1.0,0); rightEar.rotation.z=-0.4; rightEar.rotation.x=0.1; this.group.add(rightEar);

    const innerEarGeo = new THREE.ConeGeometry(0.25,0.5,16);
    const innerEarMat = new THREE.MeshStandardMaterial({ color:0xffb6c1 });
    const leftInner = new THREE.Mesh(innerEarGeo, innerEarMat);
    leftInner.position.set(-0.85,0.95,0.12); leftInner.rotation.z=0.4; leftInner.rotation.x=0.1; this.group.add(leftInner);
    const rightInner = new THREE.Mesh(innerEarGeo, innerEarMat);
    rightInner.position.set(0.85,0.95,0.12); rightInner.rotation.z=-0.4; rightInner.rotation.x=0.1; this.group.add(rightInner);

    const bowGroup = new THREE.Group(); bowGroup.position.set(-0.85,1.65,0.3); bowGroup.rotation.z=0.2;
    const bowMat = new THREE.MeshStandardMaterial({ color:0xe6004c, roughness:0.2, metalness:0.1, emissive:0x330011, emissiveIntensity:0.3 });
    const leftLoop = new THREE.Mesh(new THREE.SphereGeometry(0.38,16,16).scale(1,0.55,0.35), bowMat);
    leftLoop.position.set(-0.35,0,0); bowGroup.add(leftLoop);
    const rightLoop = new THREE.Mesh(new THREE.SphereGeometry(0.38,16,16).scale(1,0.55,0.35), bowMat);
    rightLoop.position.set(0.35,0,0); bowGroup.add(rightLoop);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.18,16,16), bowMat); bowGroup.add(knot);
    const tailGeo = new THREE.BoxGeometry(0.1,0.45,0.05);
    const tailLeft = new THREE.Mesh(tailGeo, bowMat); tailLeft.position.set(-0.15,-0.45,0); tailLeft.rotation.z=0.4; bowGroup.add(tailLeft);
    const tailRight = new THREE.Mesh(tailGeo, bowMat); tailRight.position.set(0.15,-0.45,0); tailRight.rotation.z=-0.4; bowGroup.add(tailRight);
    this.group.add(bowGroup);

    const eyeGeo = new THREE.SphereGeometry(0.14,16,16).scale(1,1.3,0.3);
    const eyeMat = new THREE.MeshStandardMaterial({ color:0x000000, roughness:0.1 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat); leftEye.position.set(-0.38,0.35,1.1); this.group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat); rightEye.position.set(0.38,0.35,1.1); this.group.add(rightEye);
    const hlGeo = new THREE.SphereGeometry(0.04,8,8);
    const hlMat = new THREE.MeshBasicMaterial({ color:0xffffff });
    const leftHL = new THREE.Mesh(hlGeo, hlMat); leftHL.position.set(-0.33,0.39,1.18); this.group.add(leftHL);
    const rightHL = new THREE.Mesh(hlGeo, hlMat); rightHL.position.set(0.43,0.39,1.18); this.group.add(rightHL);
    const noseGeo = new THREE.SphereGeometry(0.1,16,16).scale(1.3,1,0.5);
    const nose = new THREE.Mesh(noseGeo, new THREE.MeshStandardMaterial({ color:0xffcc00, roughness:0.2, emissive:0x332200, emissiveIntensity:0.3 }));
    nose.position.set(0,0.08,1.15); this.group.add(nose);
    const wMat = new THREE.MeshStandardMaterial({ color:0x333333 });
    const wGeo = new THREE.CylinderGeometry(0.015,0.015,0.65,6);
    for (let i=-1; i<=1; i++) {
      for (let side of [-1,1]) {
        const w = new THREE.Mesh(wGeo, wMat);
        w.position.set(side*0.65, 0.1+i*0.15, 0.85);
        w.rotation.z = Math.PI/2;
        w.rotation.y = side * (-0.3 + i*0.15);
        this.group.add(w);
      }
    }
    const flowerGroup = new THREE.Group(); flowerGroup.position.set(0.85,1.55,0.2);
    const petalGeo = new THREE.SphereGeometry(0.12,8,8).scale(1,1.5,0.4);
    const petalMat = new THREE.MeshStandardMaterial({ color:0xffffff });
    for (let i=0; i<5; i++) {
      const angle = (i/5)*Math.PI*2;
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(angle)*0.2, Math.sin(angle)*0.2, 0);
      petal.rotation.z = angle;
      flowerGroup.add(petal);
    }
    flowerGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.09), new THREE.MeshStandardMaterial({ color:0xffcc00 })));
    this.group.add(flowerGroup);
  }
  getObject3D() { return this.group; }
}

class ShadowClawsModel {
  constructor() { this.group = new THREE.Group(); this.build(); }
  build() {
    const bodyGeo = new THREE.SphereGeometry(1.0,32,32).scale(0.9,1.2,0.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color:0x1a0a2e, roughness:0.4, emissive:0x110022, emissiveIntensity:0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat); this.group.add(body);
    const headGeo = new THREE.SphereGeometry(0.75,32,32);
    const headMat = new THREE.MeshStandardMaterial({ color:0x2d1b4e, roughness:0.3, emissive:0x1a0033, emissiveIntensity:0.4 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0,1.0,0.6); this.group.add(head);
    const earGeo = new THREE.ConeGeometry(0.35,0.7,8);
    const earMat = new THREE.MeshStandardMaterial({ color:0x0e0518, roughness:0.3 });
    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-0.55,1.5,0.5); leftEar.rotation.z=0.5; leftEar.rotation.x=-0.2; this.group.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, earMat);
    rightEar.position.set(0.55,1.5,0.5); rightEar.rotation.z=-0.5; rightEar.rotation.x=-0.2; this.group.add(rightEar);
    const eyeGeo = new THREE.SphereGeometry(0.15,16,16);
    const eyeMat = new THREE.MeshStandardMaterial({ color:0x39ff14, roughness:0.1, emissive:0x39ff14, emissiveIntensity:1.5 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat); leftEye.position.set(-0.3,1.15,1.2); this.group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat); rightEye.position.set(0.3,1.15,1.2); this.group.add(rightEye);
    const pawGeo = new THREE.CylinderGeometry(0.2,0.25,0.5,8);
    const pawMat = new THREE.MeshStandardMaterial({ color:0x0e0518 });
    const clawGeo = new THREE.ConeGeometry(0.08,0.25,6);
    const clawMat = new THREE.MeshStandardMaterial({ color:0xaaaaaa, roughness:0.1, metalness:0.9 });
    const leftPaw = new THREE.Mesh(pawGeo, pawMat);
    leftPaw.position.set(-0.9,0.3,0.7); leftPaw.rotation.z=Math.PI/4; leftPaw.rotation.x=-0.3; this.group.add(leftPaw);
    for (let i=0; i<3; i++) {
      const claw = new THREE.Mesh(clawGeo, clawMat);
      claw.position.set(-1.15 + i*0.15, -0.1, 0.85);
      claw.rotation.z = Math.PI/2; claw.rotation.x = 0.3 + i*0.1;
      leftPaw.add(claw);
    }
    const rightPaw = new THREE.Mesh(pawGeo, pawMat);
    rightPaw.position.set(0.9,0.3,0.7); rightPaw.rotation.z=-Math.PI/4; rightPaw.rotation.x=-0.3; this.group.add(rightPaw);
    for (let i=0; i<3; i++) {
      const claw = new THREE.Mesh(clawGeo, clawMat);
      claw.position.set(1.15 - i*0.15, -0.1, 0.85);
      claw.rotation.z = -Math.PI/2; claw.rotation.x = 0.3 + i*0.1;
      rightPaw.add(claw);
    }
    const tailGeo = new THREE.CylinderGeometry(0.1,0.05,1.2,8);
    const tail = new THREE.Mesh(tailGeo, pawMat);
    tail.position.set(0,-0.9,-0.8); tail.rotation.x=0.8; tail.rotation.z=0.3; this.group.add(tail);
  }
  getObject3D() { return this.group; }
}

class Hero3D {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.model = null;
    this.particles = [];
    this.scrollTimeline = null;
  }

  init(theme) {
    const canvas = document.getElementById('hero3d');
    if (this.renderer) {
      this.cleanup();
    }
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(theme === 'dark' ? 0x0c0a1e : 0xfff0f5);
    this.scene.fog = new THREE.Fog(theme === 'dark' ? 0x0c0a1e : 0xfff0f5, 5, 20);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0.5, 8);
    this.camera.lookAt(0,0,0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (theme === 'dark') {
      this.scene.add(new THREE.AmbientLight(0x220044, 0.5));
      const dir = new THREE.DirectionalLight(0x9d4edd, 0.8);
      dir.position.set(3,5,5); this.scene.add(dir);
      const back = new THREE.PointLight(0x39ff14, 0.4);
      back.position.set(0,0,-3); this.scene.add(back);
    } else {
      this.scene.add(new THREE.AmbientLight(0xffd1dc, 0.7));
      const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(5,5,8); this.scene.add(key);
      const fill = new THREE.DirectionalLight(0xffb6c1, 0.6); fill.position.set(-3,1,3); this.scene.add(fill);
      const rim = new THREE.DirectionalLight(0xff69b4, 0.8); rim.position.set(0,-0.5,-3); this.scene.add(rim);
    }

    this.model = theme === 'dark' ? new ShadowClawsModel().getObject3D() : new KittyModel().getObject3D();
    this.scene.add(this.model);
    this.createParticles(theme);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.startRenderLoop();
  }

  createParticles(theme) {
    this.particles = [];
    const count = theme === 'dark' ? 40 : 30;
    for (let i=0; i<count; i++) {
      const geo = theme === 'dark' ? new THREE.ConeGeometry(0.08,0.2,4) : new THREE.SphereGeometry(0.06,4,4);
      const mat = new THREE.MeshStandardMaterial({
        color: theme === 'dark' ? (Math.random()>0.5?0x39ff14:0x9d4edd) : 0xffb6c1,
        roughness:0.3, emissive: theme==='dark'?0x111111:0xffb6c1, emissiveIntensity:0.4
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.set((Math.random()-0.5)*12, (Math.random()-0.5)*10, (Math.random()-0.5)*6-2);
      p.userData = { speed: new THREE.Vector3((Math.random()-0.5)*0.02,(Math.random()-0.5)*0.02,(Math.random()-0.5)*0.01), rotSpeed:(Math.random()-0.5)*0.03 };
      this.scene.add(p);
      this.particles.push(p);
    }
  }

  startScrollAnimation(theme) {
    if (this.scrollTimeline) this.scrollTimeline.kill();
    const model = this.model;
    const textContainer = document.getElementById('hero-text-container');
    const actionsDiv = document.getElementById('hero-actions');
    gsap.set(actionsDiv, { opacity:0, visibility:'hidden' });

    if (theme === 'dark') {
      gsap.set(model.position, { x:0, y:-3, z:0 });
      gsap.set(model.rotation, { y:Math.PI, x:0, z:0 });
      const tl = gsap.timeline({
        scrollTrigger: { trigger:'#hero', start:'top top', end:'+=2500', scrub:1.2, pin:true, anticipatePin:1 }
      });
      tl.set(textContainer, { innerHTML:'🕷️ The Shadow<br>Claws Archive' })
        .fromTo(model.position, { y:-3 }, { y:0, duration:0.3, ease:'power3.out' }, 0)
        .fromTo(model.rotation, { y:Math.PI }, { y:0, duration:0.3 }, 0)
        .fromTo(textContainer, { x:-100, opacity:0 }, { x:0, opacity:1, duration:0.2 }, 0)
        .set(textContainer, { innerHTML:'🐾 Prowling in the<br>darkness...' })
        .to(model.position, { x:1.5, z:-0.5, duration:0.25, ease:'power2.inOut' }, 0.25)
        .to(model.rotation, { y:-0.8, x:0.1, duration:0.25 }, 0.25)
        .fromTo(textContainer, { x:100, opacity:0 }, { x:0, opacity:1, duration:0.2 }, 0.27)
        .set(textContainer, { innerHTML:'⚔️ Secret codes<br>like claws' })
        .to(model.position, { x:0, y:0.5, z:0.5, duration:0.3 }, 0.5)
        .to(model.rotation, { y:1.2, x:-0.2 }, 0.5)
        .fromTo(textContainer, { y:60, opacity:0 }, { y:0, opacity:1, duration:0.25 }, 0.52)
        .set(textContainer, { innerHTML:'🔮 Unleash your<br>shadow self' })
        .to(model.position, { x:-1.5, y:0, z:0, duration:0.25, ease:'power2.inOut' }, 0.75)
        .to(model.rotation, { y:-1.5, x:0.2 }, 0.75)
        .fromTo(textContainer, { x:-80, opacity:0 }, { x:0, opacity:1 }, 0.77)
        .set(textContainer, { innerHTML:'💀 Join the<br>Shadow Claws' })
        .to(model.position, { x:0, y:0, z:0, duration:0.3 }, 0.95)
        .to(model.rotation, { y:0, x:0, z:0 }, 0.95)
        .to(actionsDiv, { opacity:1, visibility:'visible' }, 1.0);
      this.scrollTimeline = tl;
    } else {
      gsap.set(model.position, { x:6, y:-1, z:0 });
      gsap.set(model.rotation, { y:Math.PI*0.5, x:0, z:0 });
      const tl = gsap.timeline({
        scrollTrigger: { trigger:'#hero', start:'top top', end:'+=2500', scrub:1.2, pin:true, anticipatePin:1 }
      });
      tl.set(textContainer, { innerHTML:'🌸 Welcome to<br>Kitty Archive' })
        .fromTo(model.position, { x:6, y:-1 }, { x:0, y:0, duration:0.25, ease:'power3.out' }, 0)
        .fromTo(model.rotation, { y:Math.PI*0.5 }, { y:0 }, 0)
        .fromTo(textContainer, { x:80, opacity:0 }, { x:0, opacity:1 }, 0)
        .set(textContainer, { innerHTML:'🐱 A digital home<br>for your secret self' })
        .to(model.position, { x:-2.5, duration:0.3, ease:'power2.inOut' }, 0.22)
        .to(model.rotation, { y:-Math.PI*0.6, z:0.15 }, 0.22)
        .fromTo(textContainer, { x:-100, opacity:0 }, { x:0, opacity:1, duration:0.25, ease:'back.out(1.4)' }, 0.25)
        .set(textContainer, { innerHTML:'🔐 Each shadow has<br>a secret code' })
        .to(model.position, { x:0, y:0.5 }, 0.48)
        .to(model.rotation, { y:Math.PI*0.8, x:-0.2 }, 0.48)
        .fromTo(textContainer, { x:90, opacity:0 }, { x:0, opacity:1, duration:0.25, ease:'power4.out' }, 0.52)
        .set(textContainer, { innerHTML:'✨ Ready to create<br>your shadow?' })
        .to(model.position, { y:-0.3, duration:0.25, ease:'bounce.out' }, 0.75)
        .to(model.rotation, { y:Math.PI*1.7, x:0.3, z:-0.1 }, 0.72)
        .fromTo(textContainer, { y:60, opacity:0 }, { y:0, opacity:1 }, 0.77)
        .set(textContainer, { innerHTML:'🐱 Join the<br>Kitty Archive' })
        .to(model.position, { x:0, y:0, duration:0.3 }, 0.95)
        .to(model.rotation, { y:Math.PI*2, x:0, z:0 }, 0.95)
        .to(actionsDiv, { opacity:1, visibility:'visible' }, 1.0);
      this.scrollTimeline = tl;
    }
  }

  startRenderLoop() {
    const animate = () => {
      requestAnimationFrame(animate);
      this.particles.forEach(p => {
        p.position.x += p.userData.speed.x;
        p.position.y += p.userData.speed.y;
        p.position.z += p.userData.speed.z;
        p.rotation.x += p.userData.rotSpeed;
        p.rotation.y += p.userData.rotSpeed*0.7;
        if (Math.abs(p.position.x)>6) p.position.x*=-0.9;
        if (Math.abs(p.position.y)>5) p.position.y*=-0.9;
        if (Math.abs(p.position.z)>4) p.position.z*=-0.9;
      });
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  cleanup() {
    if (this.scrollTimeline) { this.scrollTimeline.kill(); ScrollTrigger.getAll().forEach(s => s.kill()); }
    this.particles.forEach(p => this.scene.remove(p));
    this.particles = [];
    if (this.model) this.scene.remove(this.model);
    this.renderer.dispose();
  }

  switchTheme(newTheme) {
    this.cleanup();
    this.init(newTheme);
    this.startScrollAnimation(newTheme);
  }
}