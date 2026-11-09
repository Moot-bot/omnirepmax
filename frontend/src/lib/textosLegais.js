// src/lib/textosLegais.js — GERADO a partir de gerar_textos_legais.py (não edite à mão)
// Notas [REVISAR ...] ficam só em termos.md/privacidade.md (para o advogado), não no site.
export const VERSAO_TERMOS = "1.0";
export const TERMOS = {
  "titulo": "Termos de Uso",
  "subtitulo": "Versão 1.0 — vigente a partir de 08/11/2026",
  "secoes": [
    {
      "titulo": "1. Quem somos e aceite destes termos",
      "blocos": [
        {
          "tipo": "p",
          "texto": "O OmniRepMax é um sistema online de gestão para representantes comerciais, oferecido por NORTMARKAS SOLUÇÕES TECNOLÓGICAS LTDA, CNPJ 70.009.195/0001-16, com sede em Rua Armando Andrade, 97, Coworking, Bom Retiro, Joinville/SC, CEP 89223-066 (\"nós\")."
        },
        {
          "tipo": "p",
          "texto": "Ao criar uma conta ou usar o OmniRepMax, você (\"usuário\") declara que leu e aceita estes Termos de Uso e a Política de Privacidade. Se usar o sistema em nome de uma empresa, declara ter poderes para aceitá-los em nome dela."
        }
      ]
    },
    {
      "titulo": "2. O que é o serviço",
      "blocos": [
        {
          "tipo": "p",
          "texto": "O OmniRepMax permite cadastrar representadas, clientes e produtos, lançar pedidos e orçamentos, registrar faturamentos, acompanhar comissões, contas a pagar e a receber, metas e relatórios, além de recursos opcionais de inteligência artificial (MAX AI)."
        },
        {
          "tipo": "p",
          "texto": "O serviço é fornecido pela internet, no modelo de assinatura (software como serviço). Não há instalação nem transferência de propriedade do software."
        }
      ]
    },
    {
      "titulo": "3. Cadastro e conta",
      "blocos": [
        {
          "tipo": "lista",
          "itens": [
            "Você deve informar dados verdadeiros e mantê-los atualizados.",
            "Login e senha são pessoais. Você responde pelo uso da sua conta e deve nos avisar imediatamente se suspeitar de acesso indevido.",
            "Cada conta corresponde a uma empresa ou operação, com dados isolados das demais contas.",
            "O uso é permitido apenas a maiores de 18 anos ou a pessoas jurídicas."
          ]
        }
      ]
    },
    {
      "titulo": "4. Teste grátis",
      "blocos": [
        {
          "tipo": "p",
          "texto": "Toda conta nova tem 7 (sete) dias de teste grátis, com acesso aos recursos do plano Profissional, sem necessidade de cartão de crédito."
        },
        {
          "tipo": "p",
          "texto": "Se você assinar durante o teste, a primeira cobrança ocorre somente no fim do período de teste. Se não assinar, ao fim do teste a conta passa ao modo consulta, descrito no item 7."
        }
      ]
    },
    {
      "titulo": "5. Planos, preços e cobrança",
      "blocos": [
        {
          "tipo": "p",
          "texto": "Os planos, recursos e preços vigentes estão publicados na página de planos do site e do sistema. A assinatura é mensal, com renovação automática, até que seja cancelada."
        },
        {
          "tipo": "lista",
          "itens": [
            "A cobrança é feita de forma recorrente no cartão de crédito informado, por meio do processador de pagamentos Stripe. Não armazenamos os dados completos do seu cartão.",
            "Os preços podem ser reajustados mediante aviso prévio de pelo menos 30 (trinta) dias, por e-mail ou no sistema. O novo valor vale a partir da renovação seguinte ao aviso.",
            "A troca de plano pode ser feita a qualquer momento em \"Gerenciar assinatura\". Diferenças de valor são calculadas proporcionalmente pelo Stripe.",
            "Limites de cada plano (por exemplo, número de representadas) são aplicados pelo sistema. Ao reduzir de plano, os dados que excedem o limite são mantidos, mas novos cadastros acima do limite ficam bloqueados.",
            "A nota fiscal de serviço referente a cada mensalidade é emitida por nós, conforme a legislação municipal aplicável."
          ]
        }
      ]
    },
    {
      "titulo": "6. Cancelamento, arrependimento e reembolso",
      "blocos": [
        {
          "tipo": "lista",
          "itens": [
            "Você pode cancelar a assinatura a qualquer momento em \"Gerenciar assinatura\", sem multa.",
            "O cancelamento vale ao fim do período já pago: até lá, o acesso continua normal. Depois, a conta passa ao modo consulta.",
            "Direito de arrependimento: quando a contratação for regida pelo Código de Defesa do Consumidor (Lei nº 8.078/1990, art. 49), você pode desistir em até 7 (sete) dias da primeira cobrança e receber de volta o valor pago, pelo mesmo meio de pagamento.",
            "Fora dessa hipótese, não há reembolso proporcional de mensalidades já pagas."
          ]
        }
      ]
    },
    {
      "titulo": "7. Falta de pagamento e modo consulta",
      "blocos": [
        {
          "tipo": "p",
          "texto": "Se uma cobrança for recusada, avisaremos por e-mail e o Stripe tentará cobrar novamente nos dias seguintes. Durante essas tentativas, o acesso continua normal."
        },
        {
          "tipo": "p",
          "texto": "Sem pagamento, ou ao fim do teste ou de uma assinatura cancelada, a conta entra em modo consulta: você continua podendo entrar, ver e exportar seus dados, mas não pode cadastrar nem alterar informações. Para voltar ao uso normal, basta assinar um plano."
        },
        {
          "tipo": "p",
          "texto": "Os dados de contas em modo consulta são mantidos por 90 (noventa) dias. Depois desse prazo, poderão ser excluídos definitivamente, mediante aviso prévio por e-mail."
        }
      ]
    },
    {
      "titulo": "8. Suas responsabilidades",
      "blocos": [
        {
          "tipo": "lista",
          "itens": [
            "Os dados que você cadastra (clientes, pedidos, comissões, valores) são de sua responsabilidade, inclusive quanto à exatidão e à autorização para tratá-los.",
            "Ao cadastrar dados pessoais de terceiros (como contatos de clientes), você é o controlador desses dados perante a LGPD e deve ter base legal para isso. Nós atuamos como operador, tratando-os apenas para prestar o serviço.",
            "É proibido usar o sistema para atividades ilegais, enviar código malicioso, tentar acessar dados de outras contas, sobrecarregar a infraestrutura ou revender o acesso sem autorização."
          ]
        }
      ]
    },
    {
      "titulo": "9. Limites do serviço",
      "blocos": [
        {
          "tipo": "lista",
          "itens": [
            "Cálculos de comissão, metas, previsões e indicadores são ferramentas de apoio, feitos a partir dos dados e regras que você cadastra. Eles não substituem conferência própria, contrato com as representadas nem orientação contábil ou jurídica.",
            "O OmniRepMax não emite nota fiscal eletrônica (NF-e ou NFS-e) em nome do usuário. A importação de XML apenas lê notas já emitidas.",
            "O MAX AI e os insights automáticos usam inteligência artificial e podem conter erros. Confira as informações antes de tomar decisões.",
            "Buscamos manter o sistema disponível o tempo todo, mas podem ocorrer interrupções para manutenção, atualizações ou falhas de fornecedores. Manutenções programadas serão avisadas sempre que possível.",
            "Fazemos cópias de segurança periódicas, mas recomendamos exportar seus relatórios regularmente."
          ]
        }
      ]
    },
    {
      "titulo": "10. Privacidade",
      "blocos": [
        {
          "tipo": "p",
          "texto": "O tratamento de dados pessoais segue a Política de Privacidade, que faz parte destes Termos."
        }
      ]
    },
    {
      "titulo": "11. Propriedade intelectual",
      "blocos": [
        {
          "tipo": "p",
          "texto": "O software, a marca OmniRepMax, o layout e os textos do sistema pertencem a nós ou aos nossos licenciadores. A assinatura dá a você uma licença de uso pessoal, não exclusiva e intransferível, enquanto estiver vigente. Os dados que você cadastra continuam sendo seus."
        }
      ]
    },
    {
      "titulo": "12. Suspensão e encerramento pela nossa parte",
      "blocos": [
        {
          "tipo": "p",
          "texto": "Podemos suspender ou encerrar contas que violem estes Termos ou a lei, com aviso prévio sempre que a situação permitir. Em caso de encerramento, você poderá exportar seus dados no prazo informado no aviso, salvo impedimento legal."
        }
      ]
    },
    {
      "titulo": "13. Limitação de responsabilidade",
      "blocos": [
        {
          "tipo": "p",
          "texto": "Na máxima extensão permitida pela lei, não respondemos por lucros cessantes, perda de negócios ou danos indiretos decorrentes do uso ou da impossibilidade de uso do sistema. Nossa responsabilidade total fica limitada ao valor pago pelo usuário nos 12 (doze) meses anteriores ao fato. Esta limitação não se aplica nos casos em que a lei a proíbe, inclusive nas relações de consumo."
        }
      ]
    },
    {
      "titulo": "14. Alterações destes termos",
      "blocos": [
        {
          "tipo": "p",
          "texto": "Podemos atualizar estes Termos. Mudanças relevantes serão avisadas com antecedência de pelo menos 30 (trinta) dias, por e-mail ou no sistema. Se você não concordar, pode cancelar a assinatura antes de a mudança valer."
        }
      ]
    },
    {
      "titulo": "15. Lei aplicável e foro",
      "blocos": [
        {
          "tipo": "p",
          "texto": "Estes Termos seguem as leis do Brasil. Fica eleito o foro da comarca de Joinville/SC, ressalvado o direito do consumidor de propor ação no foro do seu domicílio."
        }
      ]
    },
    {
      "titulo": "16. Contato",
      "blocos": [
        {
          "tipo": "p",
          "texto": "Dúvidas e solicitações: suporte@nortmarkas.com.br ou WhatsApp (47) 99206-5908."
        }
      ]
    }
  ]
};
export const PRIVACIDADE = {
  "titulo": "Política de Privacidade",
  "subtitulo": "Versão 1.0 — vigente a partir de 08/11/2026",
  "secoes": [
    {
      "titulo": "1. Quem é responsável pelos seus dados",
      "blocos": [
        {
          "tipo": "p",
          "texto": "NORTMARKAS SOLUÇÕES TECNOLÓGICAS LTDA, CNPJ 70.009.195/0001-16, com sede em Rua Armando Andrade, 97, Coworking, Bom Retiro, Joinville/SC, CEP 89223-066, é a controladora dos dados pessoais da sua conta (cadastro, uso e pagamento), nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD)."
        },
        {
          "tipo": "p",
          "texto": "Para os dados que você cadastra sobre os seus clientes e contatos dentro do sistema, você é o controlador e nós somos o operador: tratamos esses dados apenas para prestar o serviço, conforme as suas instruções e esta Política."
        }
      ]
    },
    {
      "titulo": "2. Quais dados coletamos",
      "blocos": [
        {
          "tipo": "tabela",
          "cabecalho": [
            "Categoria",
            "Exemplos",
            "De onde vem"
          ],
          "linhas": [
            [
              "Cadastro",
              "Nome, e-mail, telefone, empresa, tamanho da operação",
              "Você, no cadastro"
            ],
            [
              "Acesso",
              "Senha (guardada de forma irreversível), data do último acesso, endereço IP",
              "Gerados pelo uso"
            ],
            [
              "Pagamento",
              "Plano, situação da assinatura, identificadores do Stripe, CPF/CNPJ e endereço de cobrança",
              "Você, na página de pagamento do Stripe"
            ],
            [
              "Dados do seu negócio",
              "Representadas, clientes, contatos, produtos, pedidos, notas, comissões",
              "Você, ao usar o sistema"
            ],
            [
              "Comunicações",
              "Mensagens de suporte e feedbacks enviados",
              "Você"
            ]
          ]
        },
        {
          "tipo": "p",
          "texto": "Não coletamos o número completo do cartão de crédito: ele é digitado diretamente na página do Stripe."
        }
      ]
    },
    {
      "titulo": "3. Para que usamos e com qual base legal",
      "blocos": [
        {
          "tipo": "tabela",
          "cabecalho": [
            "Finalidade",
            "Base legal (LGPD, art. 7º)"
          ],
          "linhas": [
            [
              "Criar e manter a conta, prestar o serviço e o suporte",
              "Execução de contrato"
            ],
            [
              "Cobrar a assinatura e emitir nota fiscal",
              "Execução de contrato e cumprimento de obrigação legal"
            ],
            [
              "Enviar e-mails de serviço (senha, confirmação, fim do teste, cobrança)",
              "Execução de contrato"
            ],
            [
              "Segurança, prevenção de fraude e guarda de registros de acesso",
              "Legítimo interesse e obrigação legal (Marco Civil da Internet)"
            ],
            [
              "Melhorar o produto com estatísticas de uso",
              "Legítimo interesse"
            ],
            [
              "Enviar novidades e ofertas",
              "Consentimento, que pode ser retirado a qualquer momento"
            ]
          ]
        }
      ]
    },
    {
      "titulo": "4. Com quem compartilhamos",
      "blocos": [
        {
          "tipo": "p",
          "texto": "Não vendemos dados pessoais. Compartilhamos apenas com fornecedores necessários para o serviço funcionar, que tratam os dados conforme as nossas instruções:"
        },
        {
          "tipo": "tabela",
          "cabecalho": [
            "Fornecedor",
            "Para quê",
            "Onde os dados ficam"
          ],
          "linhas": [
            [
              "Stripe",
              "Processamento de pagamentos",
              "Estados Unidos e outros países"
            ],
            [
              "MongoDB Atlas",
              "Banco de dados",
              "[REGIÃO DO CLUSTER]"
            ],
            [
              "Render",
              "Servidor da aplicação",
              "Estados Unidos"
            ],
            [
              "Vercel",
              "Hospedagem do site",
              "Estados Unidos e rede global"
            ],
            [
              "Resend",
              "Envio de e-mails do sistema",
              "Estados Unidos"
            ],
            [
              "Groq",
              "Processamento das perguntas ao MAX AI e dos insights automáticos (resumos dos seus dados comerciais)",
              "Estados Unidos"
            ],
            [
              "BrasilAPI",
              "Consulta pública de CNPJ quando você usa a busca automática",
              "Brasil"
            ]
          ]
        },
        {
          "tipo": "p",
          "texto": "Também podemos compartilhar dados quando exigido por lei, ordem judicial ou autoridade competente."
        }
      ]
    },
    {
      "titulo": "5. Transferência internacional",
      "blocos": [
        {
          "tipo": "p",
          "texto": "Alguns fornecedores armazenam ou processam dados fora do Brasil. Nesses casos, adotamos as garantias previstas no art. 33 da LGPD, como cláusulas contratuais de proteção de dados oferecidas por esses fornecedores."
        }
      ]
    },
    {
      "titulo": "6. Por quanto tempo guardamos",
      "blocos": [
        {
          "tipo": "lista",
          "itens": [
            "Enquanto a conta estiver ativa ou em modo consulta.",
            "Após o cancelamento, por até 90 (noventa) dias, para permitir a reativação ou a exportação; depois, os dados são excluídos ou anonimizados.",
            "Registros de acesso: por 6 (seis) meses, como exige o Marco Civil da Internet (Lei nº 12.965/2014, art. 15).",
            "Dados fiscais e de pagamento: pelo prazo exigido pela legislação tributária.",
            "Cópias de segurança: são substituídas periodicamente e podem conter dados excluídos por um período curto, até a sua renovação."
          ]
        }
      ]
    },
    {
      "titulo": "7. Como protegemos",
      "blocos": [
        {
          "tipo": "lista",
          "itens": [
            "Conexão criptografada (HTTPS) entre o seu navegador e o sistema.",
            "Senhas guardadas com algoritmo de hash (bcrypt): nem nós conseguimos vê-las.",
            "Dados de cada conta isolados das demais.",
            "Acesso administrativo restrito e registro das ações administrativas.",
            "Banco de dados em provedor com criptografia dos dados armazenados."
          ]
        },
        {
          "tipo": "p",
          "texto": "Nenhum sistema é totalmente imune a incidentes. Se ocorrer um incidente que possa trazer risco relevante, avisaremos os titulares afetados e a Autoridade Nacional de Proteção de Dados (ANPD), conforme a LGPD."
        }
      ]
    },
    {
      "titulo": "8. Seus direitos",
      "blocos": [
        {
          "tipo": "p",
          "texto": "Conforme o art. 18 da LGPD, você pode pedir: confirmação de que tratamos seus dados; acesso; correção; anonimização, bloqueio ou eliminação de dados desnecessários; portabilidade; eliminação dos dados tratados com consentimento; informação sobre compartilhamentos; e revogação do consentimento."
        },
        {
          "tipo": "p",
          "texto": "Para exercer esses direitos, escreva para privacidade@nortmarkas.com.br. Responderemos em até 15 (quinze) dias. Você também pode reclamar à ANPD."
        }
      ]
    },
    {
      "titulo": "9. Cookies e armazenamento no navegador",
      "blocos": [
        {
          "tipo": "p",
          "texto": "Usamos apenas o necessário para o sistema funcionar: um cookie e um registro no navegador para manter você conectado, e preferências como tema claro ou escuro. Não usamos cookies de publicidade."
        }
      ]
    },
    {
      "titulo": "10. Dados dos seus clientes",
      "blocos": [
        {
          "tipo": "p",
          "texto": "Os dados que você cadastra sobre clientes e contatos pertencem ao seu negócio. Não os usamos para outras finalidades, não os vendemos e não entramos em contato com eles. Se um cliente seu pedir para exercer direitos da LGPD, você, como controlador, é quem responde; nós ajudamos com o que for necessário dentro do sistema."
        }
      ]
    },
    {
      "titulo": "11. Encarregado (DPO)",
      "blocos": [
        {
          "tipo": "p",
          "texto": "Encarregado pelo tratamento de dados pessoais: [NOME DO ENCARREGADO], e-mail privacidade@nortmarkas.com.br."
        }
      ]
    },
    {
      "titulo": "12. Alterações desta política",
      "blocos": [
        {
          "tipo": "p",
          "texto": "Podemos atualizar esta Política. Mudanças relevantes serão avisadas por e-mail ou no sistema. A versão vigente fica sempre publicada nesta página."
        }
      ]
    }
  ]
};
