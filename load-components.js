// 组件加载器 - 动态加载头部和尾部组件
class ComponentLoader {
    constructor() {
        this.components = {
            header: {
                url: 'header.html',
                containerId: 'header-container',
                position: 'afterbegin'
            },
            footer: {
                url: 'footer.html',
                containerId: 'footer-container',
                position: 'beforeend'
            }
        };
    }

    // 初始化加载所有组件
    async init() {
        try {
            console.log('开始加载组件...');
            
            // 加载头部组件
            await this.loadComponent('header');
            
            // 加载尾部组件
            await this.loadComponent('footer');
            
            // 初始化导航功能
            this.initNavigation();
            
            console.log('所有组件加载完成');
        } catch (error) {
            console.error('组件加载失败:', error);
        }
    }

    // 加载单个组件
    async loadComponent(componentName) {
        const component = this.components[componentName];
        if (!component) {
            throw new Error(`未找到组件: ${componentName}`);
        }

        try {
            // 获取组件HTML内容
            const response = await fetch(component.url);
            if (!response.ok) {
                throw new Error(`无法加载组件: ${component.url}`);
            }

            const html = await response.text();
            
            // 创建容器并插入HTML
            const container = document.createElement('div');
            container.id = component.containerId;
            container.innerHTML = html;
            
            // 插入到页面
            if (component.position === 'afterbegin') {
                document.body.insertAdjacentElement('afterbegin', container);
            } else if (component.position === 'beforeend') {
                document.body.insertAdjacentElement('beforeend', container);
            }
            
            console.log(`组件 ${componentName} 加载成功`);
            return container;
        } catch (error) {
            console.error(`加载组件 ${componentName} 失败:`, error);
            
            // 加载失败时显示备用内容
            this.showFallback(componentName);
            throw error;
        }
    }

    // 显示备用内容
    showFallback(componentName) {
        const container = document.createElement('div');
        container.id = `${componentName}-fallback`;
        container.style.padding = '1rem';
        container.style.background = 'rgba(255, 100, 100, 0.1)';
        container.style.border = '1px solid rgba(255, 100, 100, 0.3)';
        container.style.borderRadius = '8px';
        container.style.color = '#ff6b6b';
        container.style.textAlign = 'center';
        container.innerHTML = `<p>${componentName} 组件加载失败</p>`;
        
        if (componentName === 'header') {
            document.body.insertAdjacentElement('afterbegin', container);
        } else if (componentName === 'footer') {
            document.body.insertAdjacentElement('beforeend', container);
        }
    }

    // 初始化导航功能
    initNavigation() {
        // 高亮当前页面链接
        this.highlightCurrentPage();
        
        // 添加导航栏滚动效果
        this.initNavbarScroll();
        
        // 修复所有链接的点击行为
        this.fixAllLinks();
    }

    // 高亮当前页面链接
    highlightCurrentPage() {
        const currentPage = this.getCurrentPage();
        const navLinks = document.querySelectorAll('.nav-link');
        const footerLinks = document.querySelectorAll('.footer-links a');
        
        // 高亮导航链接
        navLinks.forEach(link => {
            const linkHref = link.getAttribute('href');
            if (this.isCurrentPage(linkHref, currentPage)) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        // 高亮页脚链接
        footerLinks.forEach(link => {
            const linkHref = link.getAttribute('href');
            if (this.isCurrentPage(linkHref, currentPage)) {
                link.style.color = 'var(--primary-color)';
                link.style.fontWeight = '600';
            }
        });
    }

    // 获取当前页面名称
    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop();
        return page || 'index.html';
    }

    // 判断是否是当前页面
    isCurrentPage(linkHref, currentPage) {
        if (!linkHref) return false;
        
        // 处理首页的特殊情况
        if (currentPage === 'index.html' || currentPage === '') {
            return linkHref === 'index.html' || linkHref === './' || linkHref === '/';
        }
        
        return linkHref === currentPage;
    }

    // 初始化导航栏滚动效果
    initNavbarScroll() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;
        
        const updateNavbar = () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        };
        
        // 立即更新一次
        updateNavbar();
        
        // 监听滚动事件
        window.addEventListener('scroll', updateNavbar);
    }

    // 修复所有链接的点击行为
    fixAllLinks() {
        // 修复导航链接
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            this.fixLinkClick(link);
        });
        
        // 修复页脚链接
        const footerLinks = document.querySelectorAll('.footer-links a');
        footerLinks.forEach(link => {
            this.fixLinkClick(link);
        });
        
        // 修复logo链接
        const logos = document.querySelectorAll('.logo');
        logos.forEach(logo => {
            if (logo.tagName === 'A') {
                this.fixLinkClick(logo);
            }
        });
    }

    // 修复单个链接的点击行为
    fixLinkClick(link) {
        // 移除可能存在的旧事件监听器
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        const href = newLink.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('#')) {
            return; // 外部链接或锚点链接不处理
        }
        
        newLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 如果是当前页面，只更新高亮状态
            const currentPage = this.getCurrentPage();
            if (this.isCurrentPage(href, currentPage)) {
                this.highlightCurrentPage();
                return;
            }
            
            // 否则跳转到新页面
            console.log(`导航到: ${href}`);
            window.location.href = href;
        });
    }
}

// 创建并导出组件加载器实例
const componentLoader = new ComponentLoader();

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        componentLoader.init();
    });
} else {
    componentLoader.init();
}

// 导出供其他模块使用
export default componentLoader;
