'use client'
import type { FC } from 'react'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppInfo, PromptConfig } from '@/types/app'
import FileUploaderInAttachmentWrapper from '../base/file-uploader-in-attachment'
import { AppInfoComp, ChatBtn, EditBtn, FootLogo, PromptTemplate } from './massive-component'
import Toast from '@/app/components/base/toast'
import Select from '@/app/components/base/select'
import { DEFAULT_VALUE_MAX_LEN, isShowPoweredBy } from '@/config'

// regex to match the {{}} and replace it with a span
const regex = /\{\{([^}]+)\}\}/g

export interface IWelcomeProps {
  conversationName: string
  hasSetInputs: boolean
  isPublicVersion: boolean
  siteInfo: AppInfo
  promptConfig: PromptConfig
  onStartChat: (inputs: Record<string, any>) => void
  canEditInputs: boolean
  savedInputs: Record<string, any>
  onInputsChange: (inputs: Record<string, any>) => void
}

const Welcome: FC<IWelcomeProps> = ({
  conversationName,
  hasSetInputs,
  isPublicVersion,
  siteInfo,
  promptConfig,
  onStartChat,
  canEditInputs,
  savedInputs,
  onInputsChange,
}) => {
  const { t } = useTranslation()
  const hasVar = promptConfig.prompt_variables.length > 0
  const [isFold, setIsFold] = useState<boolean>(true)
  const [inputs, setInputs] = useState<Record<string, any>>((() => {
    if (hasSetInputs) { return savedInputs }

    const res: Record<string, any> = {}
    if (promptConfig) {
      promptConfig.prompt_variables.forEach((item) => {
        res[item.key] = ''
      })
    }
    return res
  })())
  useEffect(() => {
    if (!savedInputs) {
      const res: Record<string, any> = {}
      if (promptConfig) {
        promptConfig.prompt_variables.forEach((item) => {
          res[item.key] = ''
        })
      }
      setInputs(res)
    }
    else {
      setInputs(savedInputs)
    }
  }, [savedInputs])

  const highLightPromoptTemplate = (() => {
    if (!promptConfig) { return '' }
    const res = promptConfig.prompt_template.replace(regex, (match, p1) => {
      return `<span class='text-gray-800 font-bold'>${inputs?.[p1] ? inputs?.[p1] : match}</span>`
    })
    return res
  })()

  const { notify } = Toast
  const logError = (message: string) => {
    notify({ type: 'error', message, duration: 3000 })
  }

  const renderHeader = () => {
    return (
      <div className='sticky top-0 z-10 flex items-center justify-between border-b border-gray-200/80 mobile:h-12 tablet:h-14 px-4 md:px-6 bg-white/90 backdrop-blur'>
        <div className='text-sm font-semibold text-gray-800'>{conversationName}</div>
      </div>
    )
  }

  const renderInputs = () => {
    return (
      <div className='space-y-4'>
        {promptConfig.prompt_variables.map(item => (
          <div className='flex flex-col space-y-1.5' key={item.key}>
            <label className='text-sm font-medium text-gray-700'>
              {item.name}
              {!item.required && <span className='ml-1.5 text-xs font-normal text-gray-400'>{t('app.variableTable.optional')}</span>}
            </label>
            {item.type === 'select'
              && (
                <Select
                  className='w-full'
                  defaultValue={inputs?.[item.key]}
                  onSelect={(i) => { setInputs({ ...inputs, [item.key]: i.value }) }}
                  items={(item.options || []).map(i => ({ name: i, value: i }))}
                  allowSearch={false}
                  bgClassName='bg-white'
                />
              )}
            {item.type === 'string' && (
              <input
                placeholder={t('app.errorMessage.valueOfVarRequired') === 'Variables value can not be empty' ? `Enter ${item.name}` : `请输入${item.name}`}
                value={inputs?.[item.key] || ''}
                onChange={(e) => { setInputs({ ...inputs, [item.key]: e.target.value }) }}
                className={'w-full flex-grow py-2 pl-3 pr-3 box-border rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15 transition-shadow'}
                maxLength={item.max_length || DEFAULT_VALUE_MAX_LEN}
              />
            )}
            {item.type === 'paragraph' && (
              <textarea
                className="w-full h-[104px] flex-grow py-2 pl-3 pr-3 box-border rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15 transition-shadow"
                placeholder={`Enter ${item.name}`}
                value={inputs?.[item.key] || ''}
                onChange={(e) => { setInputs({ ...inputs, [item.key]: e.target.value }) }}
              />
            )}
            {item.type === 'number' && (
              <input
                type="number"
                className="block w-full p-2 text-gray-900 border border-gray-200 rounded-lg bg-white text-sm placeholder:text-gray-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15 transition-shadow"
                placeholder={`Enter ${item.name}`}
                value={inputs[item.key]}
                onChange={(e) => { onInputsChange({ ...inputs, [item.key]: e.target.value }) }}
              />
            )}

            {
              item.type === 'file' && (
                <FileUploaderInAttachmentWrapper
                  fileConfig={{
                    allowed_file_types: item.allowed_file_types,
                    allowed_file_extensions: item.allowed_file_extensions,
                    allowed_file_upload_methods: item.allowed_file_upload_methods!,
                    number_limits: 1,
                    fileUploadConfig: {} as any,
                  }}
                  onChange={(files) => {
                    setInputs({ ...inputs, [item.key]: files[0] })
                  }}
                  value={inputs?.[item.key] || []}
                />
              )
            }
            {
              item.type === 'file-list' && (
                <FileUploaderInAttachmentWrapper
                  fileConfig={{
                    allowed_file_types: item.allowed_file_types,
                    allowed_file_extensions: item.allowed_file_extensions,
                    allowed_file_upload_methods: item.allowed_file_upload_methods!,
                    number_limits: item.max_length,
                    fileUploadConfig: {} as any,
                  }}
                  onChange={(files) => {
                    setInputs({ ...inputs, [item.key]: files })
                  }}
                  value={inputs?.[item.key] || []}
                />
              )
            }
          </div>
        ))}
      </div>
    )
  }

  const canChat = () => {
    const vars = promptConfig?.prompt_variables ?? []

    const hasEmptyRequired = vars.some((v) => {
      const isRequired = v?.required ?? true
      if (!isRequired) { return false }

      const val = inputs?.[v.key]

      if (typeof val === 'string') { return val.trim() === '' }

      return val === undefined || val === null
    })

    if (hasEmptyRequired) {
      logError(t('app.errorMessage.valueOfVarRequired'))
      return false
    }

    return true
  }

  const handleChat = () => {
    if (!canChat()) { return }

    Object.keys(inputs).forEach((key) => {
      if (!inputs[key])
      { delete inputs[key] }
    })

    onStartChat(inputs)
  }

  const renderNoVarPanel = () => {
    if (isPublicVersion) {
      return (
        <div>
          <AppInfoComp siteInfo={siteInfo} />
          <div className='mt-6 rounded-2xl border border-gray-200 bg-white p-6'>
            <PromptTemplate html={highLightPromoptTemplate} />
            <div className='mt-5'>
              <ChatBtn onClick={handleChat} />
            </div>
          </div>
        </div>
      )
    }
    // private version
    return (
      <div>
        <AppInfoComp siteInfo={siteInfo} />
        <div className='mt-6'>
          <ChatBtn onClick={handleChat} />
        </div>
      </div>
    )
  }

  const renderVarPanel = () => {
    return (
      <div>
        <AppInfoComp siteInfo={siteInfo} />
        <div className='mt-6 rounded-2xl border border-gray-200 bg-white p-6'>
          {renderInputs()}
          <div className='mt-6'>
            <ChatBtn onClick={handleChat} />
          </div>
        </div>
      </div>
    )
  }

  const renderVarOpBtnGroup = () => {
    return (
      <div className='flex mt-5 space-x-2 text-sm'>
        <button
          type='button'
          className='flex items-center gap-1.5 rounded-lg h-9 px-4 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 cursor-pointer transition-colors'
          onClick={() => {
            if (!canChat()) { return }

            onInputsChange(inputs)
            setIsFold(true)
          }}
        >
          {t('common.operation.save')}
        </button>
        <button
          type='button'
          className='flex items-center rounded-lg h-9 px-4 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors'
          onClick={() => {
            setInputs(savedInputs)
            setIsFold(true)
          }}
        >
          {t('common.operation.cancel')}
        </button>
      </div>
    )
  }

  const renderHasSetInputsPublic = () => {
    if (!canEditInputs) {
      return (
        <div className='rounded-2xl border border-gray-200 bg-white p-5'>
          <PromptTemplate html={highLightPromoptTemplate} />
        </div>
      )
    }

    return (
      <div className='rounded-2xl border border-gray-200 bg-white'>
        <div className='p-5'>
          <PromptTemplate html={highLightPromoptTemplate} />
          {isFold && (
            <div className='flex items-center justify-between mt-4 border-t border-gray-100 pt-4 text-xs text-gray-500'>
              <span>{t('app.chat.configStatusDes')}</span>
              <EditBtn onClick={() => setIsFold(false)} />
            </div>
          )}
        </div>
        {!isFold && (
          <div className='border-t border-gray-100 p-5'>
            {renderInputs()}
            {renderVarOpBtnGroup()}
          </div>
        )}
      </div>
    )
  }

  const renderHasSetInputsPrivate = () => {
    if (!canEditInputs || !hasVar) { return null }

    return (
      <div className='rounded-2xl border border-gray-200 bg-white'>
        <div className='flex items-center justify-between p-5 text-gray-500'>
          <span className='text-xs font-medium uppercase tracking-wide'>
            {!isFold ? t('app.chat.privatePromptConfigTitle') : t('app.chat.configStatusDes')}
          </span>
          {isFold && (
            <EditBtn onClick={() => setIsFold(false)} />
          )}
        </div>
        {!isFold && (
          <div className='border-t border-gray-100 p-5'>
            {renderInputs()}
            {renderVarOpBtnGroup()}
          </div>
        )}
      </div>
    )
  }

  const renderHasSetInputs = () => {
    if ((!isPublicVersion && !canEditInputs) || !hasVar) { return null }

    return (
      <div className='pt-14 pb-5'>
        {isPublicVersion ? renderHasSetInputsPublic() : renderHasSetInputsPrivate()}
      </div>)
  }

  return (
    <div className='relative mobile:min-h-[48px] tablet:min-h-[64px]'>
      {hasSetInputs && renderHeader()}
      <div className='mx-auto pc:w-[794px] max-w-full mobile:w-full px-3.5'>
        {/*  Has't set inputs  */}
        {
          !hasSetInputs && (
            <div className='pc:pt-[15vh] tablet:pt-[12vh] mobile:pt-[10vh]'>
              {hasVar
                ? (
                  renderVarPanel()
                )
                : (
                  renderNoVarPanel()
                )}
            </div>
          )
        }

        {/* Has set inputs */}
        {hasSetInputs && renderHasSetInputs()}

        {/* foot */}
        {!hasSetInputs && (
          <div className='mt-6 flex justify-between items-center h-8 text-xs text-gray-400'>
            {siteInfo.privacy_policy
              ? <div>{t('app.chat.privacyPolicyLeft')}
                <a
                  className='text-gray-500 hover:text-gray-700 transition-colors'
                  href={siteInfo.privacy_policy}
                  target='_blank'
                >{t('app.chat.privacyPolicyMiddle')}</a>
                {t('app.chat.privacyPolicyRight')}
              </div>
              : <div>
              </div>}
            {isShowPoweredBy && (
              <a className='flex items-center pr-3 space-x-3' href="https://dify.ai/" target="_blank">
                <span className='uppercase'>{t('app.chat.powerBy')}</span>
                <FootLogo />
              </a>
            )}
          </div>
        )}
      </div>
    </div >
  )
}

export default React.memo(Welcome)
