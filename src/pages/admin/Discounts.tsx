import { useEffect, useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { getDiscountCodes, createDiscountCode, deactivateDiscountCode } from '@/services/adminFinancial';
import { DiscountCode } from '@/types/admin';
import { Plus, Tag, Calendar, Users, Ban, CheckCircle, XCircle } from 'lucide-react';

export default function Discounts() {
    const { hasPermission, admin } = useAdmin();
    const [loading, setLoading] = useState(true);
    const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);

    const [formData, setFormData] = useState({
        code: '',
        discount_type: 'percentage' as 'percentage' | 'fixed_amount',
        discount_value: '',
        max_uses: '',
        min_project_value: '',
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: '',
        description: '',
        first_purchase_only: false,
    });

    useEffect(() => {
        if (hasPermission('modify_pricing_table')) {
            loadDiscounts();
        }
    }, []);

    const loadDiscounts = async () => {
        setLoading(true);
        try {
            const data = await getDiscountCodes();
            setDiscounts(data);
        } catch (error) {
            console.error('Erro ao carregar cupons:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!admin) return;

        setCreating(true);
        try {
            await createDiscountCode({
                ...formData,
                discount_value: Number(formData.discount_value),
                max_uses: formData.max_uses ? Number(formData.max_uses) : null,
                min_project_value: formData.min_project_value ? Number(formData.min_project_value) : null,
                valid_until: formData.valid_until || null,
                created_by: admin.id,
                is_active: true,
                current_uses: 0,
            });

            setShowModal(false);
            setFormData({
                code: '',
                discount_type: 'percentage',
                discount_value: '',
                max_uses: '',
                min_project_value: '',
                valid_from: new Date().toISOString().split('T')[0],
                valid_until: '',
                description: '',
                first_purchase_only: false,
            });
            loadDiscounts();
            alert('Cupom criado com sucesso!');
        } catch (error) {
            console.error('Erro ao criar cupom:', error);
            alert('Erro ao criar cupom');
        } finally {
            setCreating(false);
        }
    };

    const handleDeactivate = async (id: string) => {
        if (!confirm('Tem certeza que deseja desativar este cupom?')) return;
        try {
            await deactivateDiscountCode(id);
            loadDiscounts();
        } catch (error) {
            console.error('Erro ao desativar cupom:', error);
            alert('Erro ao desativar cupom');
        }
    };

    if (!hasPermission('modify_pricing_table')) {
        return (
            <div className="p-8 text-center text-gray-500">
                Você não tem permissão para gerenciar cupons.
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Cupons de Desconto</h1>
                    <p className="text-gray-600">Gerencie códigos promocionais e campanhas</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>Criar Cupom</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center h-64 items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {discounts.map((discount) => (
                        <div
                            key={discount.id}
                            className={`bg-white rounded-xl border p-6 shadow-sm relative overflow-hidden ${discount.is_active ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-75'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-2">
                                    <div className={`p-2 rounded-lg ${discount.is_active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        <Tag className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{discount.code}</h3>
                                        <p className="text-sm text-gray-500">
                                            {discount.discount_type === 'percentage'
                                                ? `${discount.discount_value}% OFF`
                                                : `R$ ${discount.discount_value} OFF`}
                                        </p>
                                    </div>
                                </div>
                                {discount.is_active ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center">
                                        <CheckCircle className="w-3 h-3 mr-1" /> Ativo
                                    </span>
                                ) : (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full flex items-center">
                                        <XCircle className="w-3 h-3 mr-1" /> Inativo
                                    </span>
                                )}
                            </div>

                            <p className="text-gray-600 text-sm mb-4 min-h-[40px]">
                                {discount.description || 'Sem descrição'}
                            </p>

                            <div className="space-y-2 text-sm text-gray-500 mb-6">
                                <div className="flex items-center space-x-2">
                                    <Users className="w-4 h-4" />
                                    <span>{discount.current_uses} / {discount.max_uses || '∞'} usos</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                        Validade: {discount.valid_until
                                            ? new Date(discount.valid_until).toLocaleDateString()
                                            : 'Indeterminada'}
                                    </span>
                                </div>
                            </div>

                            {discount.is_active && (
                                <button
                                    onClick={() => handleDeactivate(discount.id)}
                                    className="w-full py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center space-x-2 text-sm font-medium"
                                >
                                    <Ban className="w-4 h-4" />
                                    <span>Desativar Cupom</span>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Novo Cupom de Desconto</h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Código do Cupom
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
                                    placeholder="EX: PROMO2024"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo de Desconto
                                    </label>
                                    <select
                                        value={formData.discount_type}
                                        onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="percentage">Porcentagem (%)</option>
                                        <option value="fixed_amount">Valor Fixo (R$)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Valor do Desconto
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={formData.discount_value}
                                        onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Limite de Usos
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.max_uses}
                                        onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ilimitado"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Valor Mínimo (R$)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.min_project_value}
                                        onChange={(e) => setFormData({ ...formData, min_project_value: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Opcional"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Válido de
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.valid_from}
                                        onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Válido até
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.valid_until}
                                        onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descrição
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                                    placeholder="Descrição interna para identificar a campanha..."
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="first_purchase"
                                    checked={formData.first_purchase_only}
                                    onChange={(e) => setFormData({ ...formData, first_purchase_only: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="first_purchase" className="text-sm text-gray-700">
                                    Válido apenas para primeira compra
                                </label>
                            </div>

                            <div className="flex space-x-3 pt-4 border-t border-gray-100 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center"
                                >
                                    {creating ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                    ) : (
                                        'Criar Cupom'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
