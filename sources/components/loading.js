/**
 * Sistema de Loading States
 * Melhora a experiência do usuário com feedback visual
 */

class LoadingManager {
    constructor() {
        this.loadingElements = new Map();
        this.defaultConfig = {
            text: 'Carregando...',
            spinner: true,
            overlay: true,
            duration: 0 // 0 = sem timeout
        };
    }

    /**
     * Mostrar loading
     * @param {string} id - ID único do loading
     * @param {Object} config - Configurações do loading
     */
    show(id, config = {}) {
        const finalConfig = { ...this.defaultConfig, ...config };
        
        // Remover loading existente se houver
        this.hide(id);

        const loadingElement = this.createLoadingElement(finalConfig);
        this.loadingElements.set(id, loadingElement);

        // Adicionar ao DOM
        document.body.appendChild(loadingElement);

        // Auto-hide se duration > 0
        if (finalConfig.duration > 0) {
            setTimeout(() => this.hide(id), finalConfig.duration);
        }

        return loadingElement;
    }

    /**
     * Esconder loading
     * @param {string} id - ID do loading
     */
    hide(id) {
        const loadingElement = this.loadingElements.get(id);
        if (loadingElement) {
            loadingElement.remove();
            this.loadingElements.delete(id);
        }
    }

    /**
     * Criar elemento de loading
     * @param {Object} config - Configurações
     */
    createLoadingElement(config) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: 'Inter', sans-serif;
        `;

        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 300px;
            width: 90%;
        `;

        if (config.spinner) {
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            spinner.style.cssText = `
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            `;
            contentDiv.appendChild(spinner);
        }

        const textDiv = document.createElement('div');
        textDiv.textContent = config.text;
        textDiv.style.cssText = `
            color: #333;
            font-size: 16px;
            font-weight: 500;
        `;
        contentDiv.appendChild(textDiv);

        loadingDiv.appendChild(contentDiv);

        // Adicionar CSS da animação se não existir
        this.addSpinnerCSS();

        return loadingDiv;
    }

    /**
     * Adicionar CSS da animação
     */
    addSpinnerCSS() {
        if (document.getElementById('loading-css')) return;

        const style = document.createElement('style');
        style.id = 'loading-css';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .loading-overlay {
                animation: fadeIn 0.3s ease-in;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Loading para botões
     * @param {HTMLElement} button - Elemento do botão
     * @param {string} text - Texto do loading
     */
    showButtonLoading(button, text = 'Carregando...') {
        const originalText = button.textContent;
        const originalDisabled = button.disabled;

        button.disabled = true;
        button.textContent = text;
        button.style.opacity = '0.7';

        return {
            hide: () => {
                button.disabled = originalDisabled;
                button.textContent = originalText;
                button.style.opacity = '1';
            }
        };
    }

    /**
     * Loading para formulários
     * @param {HTMLElement} form - Elemento do formulário
     * @param {string} id - ID do loading
     */
    showFormLoading(form, id = 'form-loading') {
        const inputs = form.querySelectorAll('input, button, select, textarea');
        inputs.forEach(input => input.disabled = true);

        this.show(id, {
            text: 'Salvando...',
            duration: 0
        });

        return {
            hide: () => {
                inputs.forEach(input => input.disabled = false);
                this.hide(id);
            }
        };
    }

    /**
     * Loading para tabelas
     * @param {HTMLElement} table - Elemento da tabela
     * @param {string} id - ID do loading
     */
    showTableLoading(table, id = 'table-loading') {
        const tbody = table.querySelector('tbody');
        if (!tbody) return null;

        const originalContent = tbody.innerHTML;
        tbody.innerHTML = `
            <tr>
                <td colspan="100%" style="text-align: center; padding: 40px;">
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <div class="loading-spinner" style="width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px;"></div>
                        <span>Carregando dados...</span>
                    </div>
                </td>
            </tr>
        `;

        this.addSpinnerCSS();

        return {
            hide: () => {
                tbody.innerHTML = originalContent;
            }
        };
    }

    /**
     * Verificar se loading está ativo
     * @param {string} id - ID do loading
     */
    isActive(id) {
        return this.loadingElements.has(id);
    }

    /**
     * Limpar todos os loadings
     */
    clearAll() {
        this.loadingElements.forEach((element, id) => {
            this.hide(id);
        });
    }
}

// Instância global
window.loadingManager = new LoadingManager();

// Funções de conveniência
window.showLoading = (id, config) => window.loadingManager.show(id, config);
window.hideLoading = (id) => window.loadingManager.hide(id);
window.showButtonLoading = (button, text) => window.loadingManager.showButtonLoading(button, text);
window.showFormLoading = (form, id) => window.loadingManager.showFormLoading(form, id);
window.showTableLoading = (table, id) => window.loadingManager.showTableLoading(table, id);

