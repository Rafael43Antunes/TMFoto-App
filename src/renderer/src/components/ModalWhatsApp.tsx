import { useState, useEffect } from "react"
import { X, Smartphone, CheckCircle2, Loader2, MessageCircle, AlertTriangle } from "lucide-react"
import { QRCodeSVG } from 'qrcode.react'

interface ModalWhatsAppProps {
    isOpen: boolean
    onClose: () => void
}

export function ModalWhatsApp({ isOpen, onClose }: ModalWhatsAppProps) {
    const [estado, setEstado] = useState<'a_iniciar' | 'qr' | 'ligado' | 'erro'>('a_iniciar')
    const [qrCode, setQrCode] = useState('')

    useEffect(() => {
        if (!isOpen) return

        // 1. Pede o estado atual ao abrir
        const verificarEstado = async () => {
            const status = await (window as any).api.getWhatsappStatus()
            if (status.isReady) {
                setEstado('ligado')
            } else if (status.qrCodeData) {
                setQrCode(status.qrCodeData)
                setEstado('qr')
            } else {
                setEstado('a_iniciar')
            }
        }
        verificarEstado()

        // 2. Fica à escuta de mudanças no Backend
        ;(window as any).api.onWhatsappQr((novoQr: string) => {
            setQrCode(novoQr)
            setEstado('qr')
        })

        ;(window as any).api.onWhatsappReady(() => {
            setEstado('ligado')
        })

        ;(window as any).api.onWhatsappDisconnected(() => {
            setEstado('a_iniciar') // Volta ao início para tentar gerar novo QR
        })

        // 3. Limpa as escutas ao fechar a modal
        return () => {
            ;(window as any).api.removeWhatsappListeners()
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#333] rounded-3xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                
                <div className="p-5 border-b border-gray-100 dark:border-[#2A2A2A] flex justify-between items-center bg-gray-50/50 dark:bg-[#1A1A1D]/50">
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-emerald-500" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Ligação WhatsApp</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-800 dark:hover:text-white rounded-xl transition-colors">
                        <X className="w-5 h-5"/>
                    </button>
                </div>

                <div className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center">
                    
                    {estado === 'a_iniciar' && (
                        <div className="flex flex-col items-center gap-4 animate-fade-in">
                            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">A iniciar motor de mensagens...</p>
                        </div>
                    )}

                    {estado === 'qr' && (
                        <div className="flex flex-col items-center gap-6 animate-fade-in">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                <QRCodeSVG value={qrCode} size={200} level="H" includeMargin={false} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white text-lg flex items-center justify-center gap-2 mb-2">
                                    <Smartphone className="w-5 h-5 text-gray-400" /> Leia o QR Code
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[250px]">
                                    Abra o WhatsApp no telemóvel, vá a <b>Dispositivos Ligados</b> e aponte a câmara.
                                </p>
                            </div>
                        </div>
                    )}

                    {estado === 'ligado' && (
                        <div className="flex flex-col items-center gap-4 animate-fade-in">
                            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center border-4 border-emerald-500">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-emerald-600 dark:text-emerald-400 text-lg mb-1">WhatsApp Emparelhado!</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">O sistema já pode disparar mensagens automaticamente.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}