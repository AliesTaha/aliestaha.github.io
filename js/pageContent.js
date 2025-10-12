// Page content data
const pageContent = {
    home: `
        <div class="about-layout">
            <div class="about-content">
                <p class="intro-text">
                    i'm ali taha.<br>
                    i study computer engineering @ uwaterloo.<br>
                    i work on performance engineering.<br>
                </p>
                <p class="contact-text">
                    you can reach me at <a href="mailto:ali.taha@uwaterloo.ca">ali.taha@uwaterloo.ca</a>
                </p>
            </div>
        </div>
    `,
    technical: `
        <h1>technical</h1>
        <h2>articles</h2>
        <div class="writing-item">
            <p class="date">september 19, 2025</p>
            <h3><a href="https://www.modular.com/blog/matrix-multiplication-on-blackwell-part-4---breaking-sota" target="_blank">part 4: breaking sota: achieving 103% of peak performance on blackwell</a></h3>
            <p class="description">the final optimization techniques that push our matmul kernel past nvidia's cublas, reaching 103% of theoretical peak performance on blackwell gpus.</p>
        </div>
        <div class="writing-item">
            <p class="date">september 12, 2025</p>
            <h3><a href="https://www.modular.com/blog/matrix-multiplication-on-nvidias-blackwell-part-3-the-optimizations-behind-85-of-sota-performance" target="_blank">part 3: the optimizations behind 85% of sota performance</a></h3>
            <p class="description">diving into advanced optimization techniques including register allocation, memory coalescing, and pipelining strategies to reach 85% of peak performance.</p>
        </div>
        <div class="writing-item">
            <p class="date">september 5, 2025</p>
            <h3><a href="https://www.modular.com/blog/matrix-multiplication-on-nvidias-blackwell-part-2-using-hardware-features-to-optimize-matmul" target="_blank">part 2: using blackwell hardware features to optimize matmul</a></h3>
            <p class="description">exploring blackwell-specific features like tcgen05 instructions and tensor memory to build faster matrix multiplication kernels.</p>
        </div>
        <div class="writing-item">
            <p class="date">august 28, 2025</p>
            <h3><a href="https://www.modular.com/blog/matrix-multiplication-on-nvidias-blackwell-part-1-introduction" target="_blank">part 1: matrix multiplication on blackwell: introduction</a></h3>
            <p class="description">introducing the fundamentals of gpu programming and building a simple matmul kernel in mojo. the starting point of our journey to beat cublas.</p>
        </div>
    `,
    philosophy: `
        <h1>philosophy</h1>
        <div class="writing-item">
            <p class="date">10th October</p>
            <h3><a href="blogs/elements-a-reflection.html">elements- a reflection</a></h3>
            <p class="description">finding God</p>
        </div>
        <div class="writing-item">
            <p class="date">incomplete</p>
            <h3><a href="blogs/how-to-find-your-purpose.html">how to find your purpose</a></h3>
            <p class="description">i did not find mine yet. i'll update this when i do</p>
        </div>
    `,
    experience: `
        <h1>experience</h1>
        <div class="experience-item">
            <div class="exp-header">
                <h3>performance engineering intern</h3>
                <span class="company">modular</span>
            </div>
            <p class="meta">may – august 2025 • los altos, ca</p>
            <ul>
                <li>built matmul kernels on blackwell that beat nvidia's cublas at 103% sota (<a href="https://www.modular.com/blog/matrix-multiplication-on-nvidias-blackwell-part-1-introduction" target="_blank">blog</a>, <a href="https://github.com/modular/modular/tree/main/max/kernels/test/gpu/linalg/matmul_blackwell_iterative" target="_blank">code</a>)</li>
                <li>wrote 1d conv kernel that beat cudnn by 7x, speeding up inworld ai's tts model by 12%</li>
                <li>implemented hilbert curve scheduling for h100</li>
                <li>built specialized kernels (3d conv, bicubic resize) for midjourney inference</li>
            </ul>
        </div>
        <div class="experience-item">
            <div class="exp-header">
                <h3>software engineering intern</h3>
                <span class="company">tesla</span>
            </div>
            <p class="meta">sep – dec 2024 • fremont, ca</p>
            <ul>
                <li>built computer vision prototype for 2-post lift safety in service centers</li>
                <li>trained segmentation model to detect lift arms and compute safe angle thresholds</li>
            </ul>
        </div>
        <div class="experience-item">
            <div class="exp-header">
                <h3>software engineering intern</h3>
                <span class="company">ford</span>
            </div>
            <p class="meta">jan – april 2024 • dearborn, mi</p>
            <ul>
                <li>built automated test suite using playwright and typescript</li>
            </ul>
        </div>
        <div class="experience-item">
            <div class="exp-header">
                <h3>software engineering intern</h3>
                <span class="company">blackberry</span>
            </div>
            <p class="meta">may – aug 2023 • waterloo, on</p>
            <ul>
                <li>built full-stack analytics dashboard for service data</li>
            </ul>
        </div>
        <h2 style="margin-top: 50px;">projects</h2>
        <div class="experience-item">
            <div class="exp-header">
                <h3>matmul rewritten: cuda kernel study</h3>
            </div>
            <p class="meta">cuda • <a href="https://github.com/AliesTaha" target="_blank">github</a></p>
            <ul>
                <li>built cuda matmul kernel for a100 from scratch, progressively optimizing performance</li>
                <li>implemented memory coalescing, increasing bandwidth from 15gb/s to 110gb/s (6.5× speedup)</li>
                <li>added 1d block tiling to improve register reuse, achieving 8.5 tflops</li>
            </ul>
        </div>
        <div class="experience-item">
            <div class="exp-header">
                <h3>bare metal neural network</h3>
            </div>
            <p class="meta">python, numpy • <a href="https://github.com/AliesTaha/BareNeuralNetwork" target="_blank">github</a></p>
            <ul>
                <li>built neural network from scratch using only numpy</li>
                <li>implemented dense layers, activation, and loss functions</li>
                <li>built custom optimizers (sgd, adam) and mini-batch gradient descent</li>
            </ul>
        </div>
    `,
    contact: `
        <h1>get in touch</h1>
        <p>feel free to reach out for opportunities, collaborations, or just to chat about gpus and performance optimization.</p>
        <div class="contact-links">
            <div class="contact-item">
                <span class="label">email</span>
                <a href="mailto:ali.taha@uwaterloo.ca">ali.taha@uwaterloo.ca</a>
            </div>
            <div class="contact-item">
                <span class="label">github</span>
                <a href="https://github.com/aliestaha" target="_blank">github.com/aliestaha</a>
            </div>
            <div class="contact-item">
                <span class="label">linkedin</span>
                <a href="https://www.linkedin.com/in/aliestaha/" target="_blank">linkedin.com/in/aliestaha</a>
            </div>
        </div>
    `,
    timer: `
        <h1>Study Timer</h1>
        <div class="timer-container">
            <div class="session-input-container">
                <input type="text" id="session-name" class="session-input" placeholder="Session name" />
            </div>
            <div class="timer-progress-container">
                <div class="timer-progress-bar" id="timer-progress"></div>
            </div>
            <div class="timer-display" id="timer-display">03:00:00</div>
            <div class="timer-controls">
                <button class="timer-btn" id="start-btn">Start</button>
                <button class="timer-btn" id="pause-btn" disabled>Pause</button>
                <button class="timer-btn" id="reset-btn">Reset</button>
            </div>
            <div class="timer-presets">
                <h3>Presets</h3>
                <button class="preset-btn active" data-minutes="180">3 Hours</button>
                <button class="preset-btn" data-minutes="120">2 Hours</button>
                <button class="preset-btn" data-minutes="60">1 Hour</button>
                <button class="preset-btn" data-minutes="45">45 Min</button>
                <button class="preset-btn" data-minutes="25">25 Min</button>
            </div>
            <div class="timer-status" id="timer-status">Ready to focus</div>
            <div class="timer-log-actions">
                <button class="timer-btn secondary" id="download-log-btn">Download Log</button>
                <button class="timer-btn secondary" id="view-log-btn">View History</button>
            </div>
        </div>
    `
};



