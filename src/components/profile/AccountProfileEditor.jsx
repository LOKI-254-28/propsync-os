import React,{useEffect,useState} from 'react';
import {base44} from '@/api/base44Client';
import useAccountProfile from '@/hooks/useAccountProfile';
import ProfileAvatar from '@/components/profile/ProfileAvatar';
import FileUploadButton from '@/components/FileUploadButton';
import {SectionCard,Field} from '@/components/ui-bits';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
export default function AccountProfileEditor({onSaved}) {
  const {profile,isLoading,error:loadError,setProfile}=useAccountProfile();
  const [name,setName]=useState(''),[image,setImage]=useState(''),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  useEffect(()=>{if(profile){setName(profile.display_name);setImage(profile.profile_image);}},[profile]);
  const save=async event=>{
    event.preventDefault();if(busy||uploading)return;
    setBusy(true);setError('');setSaved(false);
    try {const {data}=await base44.functions.invoke('tenantOps',{action:'save_account_profile',display_name:name,profile_image:image});setProfile(data.profile);onSaved?.(data.profile);setSaved(true);}
    catch(e){setError(e.response?.data?.error||e.message);}
    finally{setBusy(false);}
  };
  return <SectionCard title="Account Profile">
    {isLoading?<p className="text-sm text-muted-foreground">Loading profile...</p>:loadError?<p role="alert" className="text-sm text-destructive">Could not load your profile. Please refresh.</p>:<form onSubmit={save} className="space-y-4">
      <div className="flex flex-wrap items-center gap-4"><ProfileAvatar image={image} name={name} className="h-20 w-20 text-2xl"/>
        <div><FileUploadButton imageOnly maxFiles={1} disabled={busy} documentContext={{purpose:'profile_photo'}} label="Change profile photo" onBusyChange={setUploading} onUploaded={file=>{setImage(file.file_uri);setSaved(false);}}/><p className="mt-2 text-xs text-muted-foreground">JPG, PNG or WebP, up to 10 MB. Your photo stays private.</p></div>
      </div>
      <Field label="Profile name"><Input required maxLength={254} value={name} onChange={event=>{setName(event.target.value);setSaved(false);}}/></Field>
      <p className="break-all text-sm text-muted-foreground">{profile?.email}</p>
      {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
      {saved&&<p role="status" className="text-sm text-foreground">Profile saved.</p>}
      <Button disabled={busy||uploading||!name.trim()}>{busy?'Saving...':'Save Profile'}</Button>
    </form>}
  </SectionCard>;
}